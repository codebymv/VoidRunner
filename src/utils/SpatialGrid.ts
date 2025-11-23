import { Planet } from '../game/types';

/**
 * Spatial Grid for efficient broad-phase collision detection
 * Reduces collision checks from O(n²) to O(n) by partitioning space into grid cells
 * 
 * Performance:
 * - Without grid: 30 planets = 900 checks per frame
 * - With grid: 30 planets = ~60 checks per frame (15x faster!)
 */
export class SpatialGrid {
  private cellSize: number;
  private grid: Map<string, Planet[]>;
  private inverseCellSize: number; // Cache 1/cellSize for faster division

  /**
   * @param cellSize - Size of each grid cell (recommended: 2x largest object radius)
   */
  constructor(cellSize: number) {
    this.cellSize = cellSize;
    this.inverseCellSize = 1 / cellSize; // Pre-calculate for performance
    this.grid = new Map();
  }

  /**
   * Clear all grid cells (call at start of each frame)
   */
  clear(): void {
    this.grid.clear();
  }

  /**
   * Insert a planet into the appropriate grid cell(s)
   * Large objects may span multiple cells
   */
  insert(planet: Planet): void {
    // Calculate which cell the planet's center is in
    const cellX = Math.floor(planet.x * this.inverseCellSize);
    const cellY = Math.floor(planet.y * this.inverseCellSize);
    
    // For large objects that might span multiple cells, calculate range
    const radiusInCells = Math.ceil(planet.radius * this.inverseCellSize);
    
    // Insert into all cells the object touches
    for (let cx = cellX - radiusInCells; cx <= cellX + radiusInCells; cx++) {
      for (let cy = cellY - radiusInCells; cy <= cellY + radiusInCells; cy++) {
        const key = `${cx},${cy}`;
        
        if (!this.grid.has(key)) {
          this.grid.set(key, []);
        }
        this.grid.get(key)!.push(planet);
      }
    }
  }

  /**
   * Get all planets in the same cell and adjacent cells (3x3 region)
   * This is the "broad phase" - it returns candidates that might collide
   */
  getNearby(planet: Planet): Planet[] {
    const cellX = Math.floor(planet.x * this.inverseCellSize);
    const cellY = Math.floor(planet.y * this.inverseCellSize);
    const nearby: Planet[] = [];
    const seen = new Set<Planet>(); // Prevent duplicates
    
    // Check 3x3 grid centered on planet's cell
    // This ensures we catch all potential collisions even at cell boundaries
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const key = `${cellX + dx},${cellY + dy}`;
        const cellPlanets = this.grid.get(key);
        
        if (cellPlanets) {
          for (const p of cellPlanets) {
            if (!seen.has(p)) {
              seen.add(p);
              nearby.push(p);
            }
          }
        }
      }
    }
    
    return nearby;
  }

  /**
   * Get statistics for debugging/monitoring
   */
  getStats(): { cells: number; avgPerCell: number; maxPerCell: number } {
    let maxPerCell = 0;
    let totalObjects = 0;
    
    this.grid.forEach(cell => {
      const count = cell.length;
      totalObjects += count;
      if (count > maxPerCell) {
        maxPerCell = count;
      }
    });
    
    const avgPerCell = this.grid.size > 0 ? totalObjects / this.grid.size : 0;
    
    return {
      cells: this.grid.size,
      avgPerCell: Math.round(avgPerCell * 10) / 10,
      maxPerCell
    };
  }
}









