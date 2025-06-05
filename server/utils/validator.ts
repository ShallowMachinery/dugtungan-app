import { dictionary, DictionaryEntry } from "../gameInit";

export function computeZArray(str: string): number[] {
  const n = str.length;
  const Z = new Array(n).fill(0);
  let L = 0, R = 0;

  for (let i = 1; i < n; i++) {
    if (i > R) {
      L = R = i;
      while (R < n && str[R - L] === str[R]) {
        R++;
      }
      Z[i] = R - L;
      R--;
    } else {
      const k = i - L;
      if (Z[k] < R - i + 1) {
        Z[i] = Z[k];
      } else {
        L = i;
        while (R < n && str[R - L] === str[R]) {
          R++;
        }
        Z[i] = R - L;
        R--;
      }
    }
  }
  return Z;
}

export function findPattern(text: string, pattern: string): boolean {
  const concat = pattern + '$' + text;
  const Z = computeZArray(concat);
  const patternLength = pattern.length;

  // Check if pattern exists in text
  for (let i = patternLength + 1; i < Z.length; i++) {
    if (Z[i] === patternLength) {
      return true;
    }
  }
  return false;
}

// Optimize dictionary lookup with a Map for O(1) access
const dictionaryMap = new Map<string, DictionaryEntry>();
const synonymMap = new Map<string, string>();

export function initializeDictionaryMaps() {
  dictionary.forEach((entry: DictionaryEntry) => {
    const normalizedWord = entry.word.toLowerCase();
    dictionaryMap.set(normalizedWord, entry);

    // Add synonyms to the synonym map
    entry.synonyms.forEach(synonym => {
      synonymMap.set(synonym.toLowerCase(), normalizedWord);
    });
  });
}

export function validateWord(word: string, syllable: string): { isValid: boolean; message: string } {
  const normalizedWord = word.toLowerCase().trim();
  const normalizedSyllable = syllable.toLowerCase().trim();

  console.log('=== Word Validation Debug ===');
  console.log('Input word:', word);
  console.log('Normalized word:', normalizedWord);
  console.log('Current syllable:', syllable);
  console.log('Normalized syllable:', normalizedSyllable);

  // Check if word is empty or too short
  if (!normalizedWord) {
    console.log('Validation failed: Empty word');
    return { isValid: false, message: 'Please enter a word!' };
  }

  // Check if word contains the syllable using Z-algorithm
  if (!findPattern(normalizedWord, normalizedSyllable)) {
    console.log('Validation failed: Word does not contain syllable');
    console.log('Word:', normalizedWord);
    console.log('Syllable:', normalizedSyllable);
    return { isValid: false, message: `Word must contain the syllable "${syllable}"!` };
  }

  // Check if word exists in dictionary using optimized lookup
  const wordEntry = dictionaryMap.get(normalizedWord) ||
    (synonymMap.has(normalizedWord) ? dictionaryMap.get(synonymMap.get(normalizedWord)!) : undefined);

  if (!wordEntry) {
    console.log('Validation failed: Word not found in dictionary');
    return { isValid: false, message: 'Word not found in dictionary!' };
  }

  console.log('Validation successful:', {
    word: wordEntry.word,
    language: wordEntry.lang,
    definitions: wordEntry.definitions
  });
  return { isValid: true, message: 'Word is valid!' };
}