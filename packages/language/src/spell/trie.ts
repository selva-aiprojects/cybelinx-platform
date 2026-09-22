class TrieNode {
  children: Map<string, TrieNode> = new Map();
  isEndOfWord = false;
  originalWord?: string;
}

export class PrefixTrie {
  private root: TrieNode = new TrieNode();
  private size = 0;

  public insert(word: string): void {
    if (!word) return;
    const lower = word.toLowerCase();
    let current = this.root;

    for (const char of lower) {
      if (!current.children.has(char)) {
        current.children.set(char, new TrieNode());
      }
      current = current.children.get(char)!;
    }

    if (!current.isEndOfWord) {
      current.isEndOfWord = true;
      current.originalWord = word;
      this.size++;
    }
  }

  public insertBatch(words: string[]): void {
    for (const word of words) {
      this.insert(word);
    }
  }

  public contains(word: string): boolean {
    if (!word) return false;
    const lower = word.toLowerCase();
    let current = this.root;

    for (const char of lower) {
      if (!current.children.has(char)) {
        return false;
      }
      current = current.children.get(char)!;
    }

    return current.isEndOfWord;
  }

  public getSize(): number {
    return this.size;
  }

  public getSuggestions(word: string, maxSuggestions = 5, maxDistance = 2): string[] {
    if (!word) return [];
    const target = word.toLowerCase();
    const results: Array<{ word: string; distance: number }> = [];

    const traverse = (node: TrieNode, currentWord: string, previousRow: number[]) => {
      const currentRow = [previousRow[0] + 1];

      for (let i = 1; i <= target.length; i++) {
        const insertCost = currentRow[i - 1] + 1;
        const deleteCost = previousRow[i] + 1;
        const replaceCost =
          previousRow[i - 1] + (target[i - 1] === currentWord[currentWord.length - 1] ? 0 : 1);

        currentRow.push(Math.min(insertCost, deleteCost, replaceCost));
      }

      if (currentRow[target.length] <= maxDistance && node.isEndOfWord && node.originalWord) {
        results.push({
          word: node.originalWord,
          distance: currentRow[target.length],
        });
      }

      if (Math.min(...currentRow) <= maxDistance) {
        for (const [char, childNode] of node.children.entries()) {
          traverse(childNode, currentWord + char, currentRow);
        }
      }
    };

    const initialRow: number[] = [];
    for (let i = 0; i <= target.length; i++) {
      initialRow.push(i);
    }

    for (const [char, childNode] of this.root.children.entries()) {
      traverse(childNode, char, initialRow);
    }

    results.sort((a, b) => a.distance - b.distance);
    return results.slice(0, maxSuggestions).map((r) => r.word);
  }
}
