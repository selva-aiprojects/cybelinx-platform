import { CheckMatch } from '../types';
import { PrefixTrie } from './trie';

export class SpellChecker {
  private trie: PrefixTrie = new PrefixTrie();
  private ignoredWords: Set<string> = new Set();

  constructor(initialWords: string[] = []) {
    if (initialWords.length > 0) {
      this.trie.insertBatch(initialWords);
    }
  }

  public loadWords(words: string[]): void {
    this.trie.insertBatch(words);
  }

  public addWord(word: string): void {
    this.trie.insert(word);
  }

  public ignoreWord(word: string): void {
    this.ignoredWords.add(word.toLowerCase());
  }

  public checkWord(word: string): boolean {
    if (!word) return true;
    const lower = word.toLowerCase();
    if (this.ignoredWords.has(lower)) return true;
    return this.trie.contains(lower);
  }

  public getSuggestions(word: string, maxSuggestions = 4): string[] {
    return this.trie.getSuggestions(word, maxSuggestions);
  }

  public checkText(text: string): CheckMatch[] {
    if (!text || typeof text !== 'string') return [];

    const matches: CheckMatch[] = [];
    // Match word boundaries considering letters, hyphens, and alphanumeric tokens
    const wordRegex = /\b[a-zA-Z][a-zA-Z0-9-]*[a-zA-Z0-9]?\b/g;
    let match: RegExpExecArray | null;

    while ((match = wordRegex.exec(text)) !== null) {
      const word = match[0];
      const offset = match.index;
      const length = word.length;

      // Skip single character tokens or pure numbers
      if (length <= 1 || /^\d+$/.test(word)) {
        continue;
      }

      if (!this.checkWord(word)) {
        matches.push({
          offset,
          length,
          word,
          type: 'spelling',
          message: `Possible spelling mistake found: "${word}".`,
          suggestions: this.getSuggestions(word),
        });
      }
    }

    return matches;
  }
}
