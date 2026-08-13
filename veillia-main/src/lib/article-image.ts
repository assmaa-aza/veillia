import heroAi from "@/assets/hero-ai.jpg";
import innovRobot from "@/assets/innov-robot.jpg";
import innovChip from "@/assets/innov-chip.jpg";
import innovDc from "@/assets/innov-datacenter.jpg";
import innovGen from "@/assets/innov-genai.jpg";
import aboutIllustration from "@/assets/about-illustration.jpg";

interface MinimalArticle {
  id?: number | string;
  title?: string | null;
  category?: string | null;
  source?: string | null;
  tags?: string[] | null;
}

/**
 * Returns a high-quality relevant image URL for any article based on title, category, source, and tags.
 */
export function getArticleImage(article: MinimalArticle): string {
  const title = (article.title || "").toLowerCase();
  const category = (article.category || "").toLowerCase();
  const source = (article.source || "").toLowerCase();
  const tags = (article.tags || []).map((t) => t.toLowerCase());

  // 1. Hardware / Chip / Semiconductors
  if (
    title.includes("chip") ||
    title.includes("hardware") ||
    title.includes("gpu") ||
    title.includes("nvidia") ||
    title.includes("broadcom") ||
    title.includes("silicon") ||
    tags.includes("hardware")
  ) {
    return innovChip;
  }

  // 2. Robotics / Automation / Humanoid / Autonomous Agents
  if (
    title.includes("robot") ||
    title.includes("humanoid") ||
    title.includes("agent") ||
    title.includes("autonomous") ||
    category.includes("tendance") ||
    tags.includes("robotics")
  ) {
    return innovRobot;
  }

  // 3. Infrastructure / Datacenter / Cloud / Enterprise Systems
  if (
    title.includes("datacenter") ||
    title.includes("cloud") ||
    title.includes("infrastructure") ||
    title.includes("server") ||
    title.includes("telecom") ||
    title.includes("enterprise") ||
    category.includes("ecosysteme")
  ) {
    return innovDc;
  }

  // 4. Research / Papers / Lab Experiments / Science
  if (
    title.includes("paper") ||
    title.includes("research") ||
    title.includes("study") ||
    title.includes("bug") ||
    title.includes("discovery") ||
    source.includes("arxiv") ||
    source.includes("mit") ||
    category.includes("recherche")
  ) {
    return aboutIllustration;
  }

  // 5. Generative AI / LLMs / GPT / Claude / Mistral / Music / Media
  if (
    title.includes("gpt") ||
    title.includes("llm") ||
    title.includes("model") ||
    title.includes("mistral") ||
    title.includes("openai") ||
    title.includes("anthropic") ||
    title.includes("music") ||
    title.includes("suno") ||
    category.includes("produit") ||
    category.includes("startup")
  ) {
    return innovGen;
  }

  // Deterministic fallback based on article ID or title hash
  const seed = (article.id ? Number(article.id) : 0) || title.length;
  const FALLBACKS = [heroAi, innovGen, innovRobot, innovChip, innovDc, aboutIllustration];
  return FALLBACKS[seed % FALLBACKS.length];
}
