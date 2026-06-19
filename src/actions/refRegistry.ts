import type { Page } from "playwright";

import type { DomCompactElement, DomCompactObservation } from "../observers/domCompact.js";

export interface ExecutableTarget {
  ref: string;
  click(): Promise<void>;
  fill(text: string): Promise<void>;
  type(text: string): Promise<void>;
  select(value: string): Promise<void>;
}

export interface RefRegistry {
  resolve(ref: string): Promise<ExecutableTarget | null>;
}

export interface DomCompactRefTarget {
  ref: string;
  selector: string;
}

export class DomCompactRefRegistry implements RefRegistry {
  private readonly targetsByRef: Map<string, ExecutableTarget>;

  constructor(page: Page, observation: DomCompactObservation) {
    this.targetsByRef = new Map(
      collectDomCompactRefTargets(observation.elements).map((target) => [
        target.ref,
        new PlaywrightLocatorTarget(page, target.ref, target.selector)
      ])
    );
  }

  async resolve(ref: string): Promise<ExecutableTarget | null> {
    return this.targetsByRef.get(ref) ?? null;
  }
}

export function buildDomCompactRefRegistry(
  page: Page,
  observation: DomCompactObservation
): RefRegistry {
  return new DomCompactRefRegistry(page, observation);
}

export function collectDomCompactRefTargets(elements: DomCompactElement[]): DomCompactRefTarget[] {
  return elements
    .filter((element) => element.interactive && Boolean(element.selectorHint))
    .map((element) => ({
      ref: element.ref,
      selector: element.selectorHint as string
    }));
}

class PlaywrightLocatorTarget implements ExecutableTarget {
  constructor(
    private readonly page: Page,
    readonly ref: string,
    private readonly selector: string
  ) {}

  async click(): Promise<void> {
    await this.page.locator(this.selector).first().click();
  }

  async fill(text: string): Promise<void> {
    await this.page.locator(this.selector).first().fill(text);
  }

  async type(text: string): Promise<void> {
    await this.page.locator(this.selector).first().type(text);
  }

  async select(value: string): Promise<void> {
    await this.page.locator(this.selector).first().selectOption(value);
  }
}
