import { useState, useEffect, useCallback } from 'react';
import type { CommuteHistoryEntry, Coordinates } from '../types';

const STORAGE_KEY = 'locaLertHistory';
const MAX_HISTORY_ITEMS = 5;

export function useCommuteHistory() {
  const [history, setHistory] = useState<CommuteHistoryEntry[]>([]);

  useEffect(() => {
    try {
      const storedHistory = window.localStorage.getItem(STORAGE_KEY);
      if (storedHistory) {
        setHistory(JSON.parse(storedHistory));
      }
    } catch (error) {
      console.error('Failed to load commute history from localStorage:', error);
    }
  }, []);

  const saveHistory = (newHistory: CommuteHistoryEntry[]) => {
    try {
      setHistory(newHistory);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
    } catch (error) {
      console.error('Failed to save commute history to localStorage:', error);
    }
  };

  const addCommuteToHistory = useCallback((destination: { name: string; coords: Coordinates }) => {
    const newEntry: CommuteHistoryEntry = {
      id: Date.now().toString(),
      destinationName: destination.name,
      destinationCoords: destination.coords,
      timestamp: Date.now(),
    };

    // Remove any previous entry with the same name to avoid duplicates and keep the latest one on top.
    const filteredHistory = history.filter(
      (item) => item.destinationName.toLowerCase() !== newEntry.destinationName.toLowerCase()
    );

    const updatedHistory = [newEntry, ...filteredHistory].slice(0, MAX_HISTORY_ITEMS);
    saveHistory(updatedHistory);
  }, [history]);

  const clearHistory = useCallback(() => {
    try {
      saveHistory([]);
      window.localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear commute history from localStorage:', error);
    }
  }, []);

  return { history, addCommuteToHistory, clearHistory };
}