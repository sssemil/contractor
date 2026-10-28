import { useEffect, useState } from 'react';
import { defaultRecipe, parseRecipe, type RecipeConfig } from '@/recipe/config';

export const STORAGE_KEY = 'contractor.recipe.v1';

function loadDraft() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return { config: raw ? parseRecipe(raw) : defaultRecipe(), issue: '', canSave: true };
  } catch {
    return {
      config: defaultRecipe(),
      issue: 'Your saved draft could not be loaded. Changes will start a new draft; export JSON to keep a copy.',
      canSave: false,
    };
  }
}

export function useDraft() {
  const [initial] = useState(loadDraft);
  const [config, setConfig] = useState(initial.config);
  const [canSave, setCanSave] = useState(initial.canSave);
  const [storageIssue, setStorageIssue] = useState(initial.issue);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (!canSave) return;
    setSaved(false);
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
        setStorageIssue('');
        setSaved(true);
      } catch {
        setStorageIssue('Local saving is unavailable. Export your recipe JSON to keep your work.');
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [config, canSave]);
  function updateConfig(next: RecipeConfig) {
    setConfig(next);
    setCanSave(true);
  }
  return { config, updateConfig, storageIssue, saved };
}

export function downloadFile(content: string, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
