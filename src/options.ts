import bark from '@/index';

type OptionsUpdateCallback = (options: bark.Options) => void;

class OptionsManager {
  static #instance: OptionsManager;
  private options: bark.Options = {};
  private optionsSubscribers: Set<OptionsUpdateCallback> = new Set();

  private constructor() {
    this.options = {
      showTimestamp: true,
    }
  }

  public static get instance(): OptionsManager {
    if (!OptionsManager.#instance) {
      OptionsManager.#instance = new OptionsManager();
    }
    return OptionsManager.#instance;
  }

  updateOptions(newOptions: bark.Options) {
    this.options = { ...this.options, ...newOptions };
    this.notifySubscribers();
  }

  subscribe(callback: OptionsUpdateCallback): () => void {
    this.optionsSubscribers.add(callback);

    // Immediately call with current state
    callback(this.options);

    // Return unsubscribe function
    return () => this.optionsSubscribers.delete(callback);
  }

  get(): bark.Options {
    return this.options;
  }

  private notifySubscribers() {
    this.optionsSubscribers.forEach(callback => {
      callback(this.options);
    });
  }
}

export const optionsManager = OptionsManager.instance;