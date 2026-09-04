import Database from 'better-sqlite3';
import * as sqliteVec from 'sqlite-vec';
import OpenAI from 'openai';

export class Cache {
  private db: Database.Database;
  private openai = new OpenAI();

  constructor() {
    this.db = new Database('ai_cache.db');
    sqliteVec.load(this.db);

    // Simplification: One single table for everything (text data + vector fields combined)
    this.db.prepare(`
      CREATE VIRTUAL TABLE IF NOT EXISTS semantic_cache USING vec0(
        question TEXT,
        answer TEXT,
        question_vector float[1536]
      );
    `).run();
  }

  // Helper to convert text into a vector list using OpenAI
  private async getEmbedding(text: string): Promise<Float32Array> {
    const res = await this.openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: [text],
    });
    
    const embedding = res.data?.[0]?.embedding;
    if (!embedding) {
      throw new Error("Failed to generate embedding vector from OpenAI API");
    }
    
    return new Float32Array(embedding);
  }


  public async get(userQuestion: string): Promise<string | null> {
    try {
      const vector = await this.getEmbedding(userQuestion);
      const match = this.db.prepare(`
        SELECT answer FROM semantic_cache 
        WHERE vec_distance_cosine(question_vector, ?) < 0.15 
        ORDER BY vec_distance_cosine(question_vector, ?) ASC LIMIT 1;
      `).get(Buffer.from(vector.buffer), Buffer.from(vector.buffer)) as { answer: string } | undefined;

      return match ? match.answer : null;
    } catch {
      return null; 
    }
  }
  public async set(userQuestion: string, aiAnswer: string): Promise<void> {
    try {
      const vector = await this.getEmbedding(userQuestion);

      this.db.prepare(`
        INSERT INTO semantic_cache (question, answer, question_vector) 
        VALUES (?, ?, ?);
      `).run(userQuestion, aiAnswer, Buffer.from(vector.buffer));
    } catch (err) {
      console.error('[Cache Save Failed]:', err);
    }
  }
}
