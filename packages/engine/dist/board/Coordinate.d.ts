/**
 * Coordinate utility class.
 *
 * Handles:
 * - Canonical serialization of (x, y) to "x,y" format.
 * - Deserialization back to {x, y}.
 * - Adjacency checks.
 * - Line extraction (rows/columns).
 */
import { Coordinate, Position } from '../types.js';
export declare class CoordinateUtil {
    /**
     * Serialize a coordinate pair to canonical string format.
     * Example: (3, -2) → "3,-2"
     */
    static serialize(x: number, y: number): Coordinate;
    /**
     * Deserialize a coordinate string back to {x, y}.
     * Example: "3,-2" → {x: 3, y: -2}
     */
    static deserialize(coordinate: Coordinate): Position;
    /**
     * Check if two coordinates are orthogonally adjacent (Manhattan distance = 1).
     */
    static areAdjacent(coord1: Coordinate, coord2: Coordinate): boolean;
    /**
     * Get all orthogonal neighbors of a coordinate.
     */
    static getNeighbors(coordinate: Coordinate): Coordinate[];
    /**
     * Determine the axis alignment of a set of coordinates.
     * Returns 'horizontal', 'vertical', or null if not aligned.
     */
    static getAxis(coordinates: Coordinate[]): 'horizontal' | 'vertical' | null;
    /**
     * Sort coordinates along an axis (horizontal or vertical).
     */
    static sortByAxis(coordinates: Coordinate[], axis: 'horizontal' | 'vertical'): Coordinate[];
    /**
     * Check if a set of coordinates is contiguous (no gaps).
     * Assumes they are already aligned on the same axis.
     */
    static isContiguous(coordinates: Coordinate[]): boolean;
    /**
     * Get the span (range) of coordinates along an axis.
     * Returns an array of all coordinates from min to max.
     */
    static getSpan(coordinates: Coordinate[]): {
        start: Coordinate;
        end: Coordinate;
        allCoordinates: Coordinate[];
    };
    /**
     * Check if coordinate is valid (must have both x and y as integers).
     */
    static isValid(coordinate: unknown): coordinate is Coordinate;
}
export default CoordinateUtil;
