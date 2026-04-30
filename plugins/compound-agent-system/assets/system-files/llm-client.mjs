export class LLMClient {
  static create() {
    return new LLMClient();
  }

  async rankSkills(_goal, items) {
    return items.map((item, index) => ({ slug: item.slug, score: items.length - index, reason: "deterministic fallback" }));
  }
}
