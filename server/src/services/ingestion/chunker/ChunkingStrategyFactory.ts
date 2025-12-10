import { IChunkingStrategy } from './IChunkingStrategy';
import { createFixedSizeChunkingStrategy } from './FixedSizeChunkingStrategy';

/**
 * Factory for creating chunking strategies
 */
export class ChunkingStrategyFactory {
  private strategies: Map<string, IChunkingStrategy>;

  constructor() {
    // Register all available strategies
    this.strategies = new Map();
    
    const fixedSizeStrategy = createFixedSizeChunkingStrategy();
    this.strategies.set(fixedSizeStrategy.getName(), fixedSizeStrategy);
    
    // Add more strategies here as they are implemented
    // const semanticStrategy = createSemanticChunkingStrategy();
    // this.strategies.set(semanticStrategy.getName(), semanticStrategy);
  }

  /**
   * Get a chunking strategy by name
   * @param strategyName - Name of the strategy
   * @returns IChunkingStrategy - The chunking strategy
   * @throws Error if strategy is not found
   */
  getStrategy(strategyName: string): IChunkingStrategy {
    const strategy = this.strategies.get(strategyName);

    if (!strategy) {
      throw new Error(
        `Chunking strategy '${strategyName}' not found. Available strategies: ${this.getAvailableStrategies().join(', ')}`
      );
    }

    return strategy;
  }

  /**
   * Get all available strategy names
   * @returns string[] - Array of strategy names
   */
  getAvailableStrategies(): string[] {
    return Array.from(this.strategies.keys());
  }

  /**
   * Check if a strategy is available
   * @param strategyName - Name of the strategy
   * @returns boolean - True if the strategy is available
   */
  hasStrategy(strategyName: string): boolean {
    return this.strategies.has(strategyName);
  }
}

/**
 * Singleton instance of the chunking strategy factory
 */
let factoryInstance: ChunkingStrategyFactory | null = null;

/**
 * Get the chunking strategy factory instance
 * @returns ChunkingStrategyFactory - The factory instance
 */
export const getChunkingStrategyFactory = (): ChunkingStrategyFactory => {
  if (!factoryInstance) {
    factoryInstance = new ChunkingStrategyFactory();
  }
  return factoryInstance;
};
