/**
 * Coordinate utility class.
 *
 * Handles:
 * - Canonical serialization of (x, y) to "x,y" format.
 * - Deserialization back to {x, y}.
 * - Adjacency checks.
 * - Line extraction (rows/columns).
 */
export class CoordinateUtil {
    /**
     * Serialize a coordinate pair to canonical string format.
     * Example: (3, -2) → "3,-2"
     */
    static serialize(x, y) {
        if (!Number.isInteger(x) || !Number.isInteger(y)) {
            throw new Error(`Invalid coordinates: (${x}, ${y}). Must be integers.`);
        }
        return `${x},${y}`;
    }
    /**
     * Deserialize a coordinate string back to {x, y}.
     * Example: "3,-2" → {x: 3, y: -2}
     */
    static deserialize(coordinate) {
        const parts = coordinate.split(',');
        if (parts.length !== 2) {
            throw new Error(`Invalid coordinate format: ${coordinate}. Expected "x,y".`);
        }
        const xPart = parts[0];
        const yPart = parts[1];
        if (xPart === undefined || yPart === undefined) {
            throw new Error(`Invalid coordinate format: ${coordinate}. Expected "x,y".`);
        }
        const x = parseInt(xPart, 10);
        const y = parseInt(yPart, 10);
        if (isNaN(x) || isNaN(y)) {
            throw new Error(`Invalid coordinate: ${coordinate}. Could not parse as integers.`);
        }
        return { x, y };
    }
    /**
     * Check if two coordinates are orthogonally adjacent (Manhattan distance = 1).
     */
    static areAdjacent(coord1, coord2) {
        const pos1 = this.deserialize(coord1);
        const pos2 = this.deserialize(coord2);
        const dx = Math.abs(pos1.x - pos2.x);
        const dy = Math.abs(pos1.y - pos2.y);
        return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
    }
    /**
     * Get all orthogonal neighbors of a coordinate.
     */
    static getNeighbors(coordinate) {
        const pos = this.deserialize(coordinate);
        return [
            this.serialize(pos.x + 1, pos.y),
            this.serialize(pos.x - 1, pos.y),
            this.serialize(pos.x, pos.y + 1),
            this.serialize(pos.x, pos.y - 1),
        ];
    }
    /**
     * Determine the axis alignment of a set of coordinates.
     * Returns 'horizontal', 'vertical', or null if not aligned.
     */
    static getAxis(coordinates) {
        if (coordinates.length === 0)
            return null;
        if (coordinates.length === 1)
            return null;
        const first = this.deserialize(coordinates[0]);
        const second = this.deserialize(coordinates[1]);
        if (first.y === second.y) {
            // Check all have same y
            for (const coord of coordinates.slice(2)) {
                const pos = this.deserialize(coord);
                if (pos.y !== first.y)
                    return null;
            }
            return 'horizontal';
        }
        else if (first.x === second.x) {
            // Check all have same x
            for (const coord of coordinates.slice(2)) {
                const pos = this.deserialize(coord);
                if (pos.x !== first.x)
                    return null;
            }
            return 'vertical';
        }
        return null;
    }
    /**
     * Sort coordinates along an axis (horizontal or vertical).
     */
    static sortByAxis(coordinates, axis) {
        const positions = coordinates.map((coord) => ({
            coord,
            pos: this.deserialize(coord),
        }));
        if (axis === 'horizontal') {
            positions.sort((a, b) => a.pos.x - b.pos.x);
        }
        else {
            positions.sort((a, b) => a.pos.y - b.pos.y);
        }
        return positions.map((p) => p.coord);
    }
    /**
     * Check if a set of coordinates is contiguous (no gaps).
     * Assumes they are already aligned on the same axis.
     */
    static isContiguous(coordinates) {
        if (coordinates.length <= 1)
            return true;
        const axis = this.getAxis(coordinates);
        if (!axis)
            return false;
        const sorted = this.sortByAxis(coordinates, axis);
        const positions = sorted.map((coord) => this.deserialize(coord));
        if (axis === 'horizontal') {
            for (let i = 1; i < positions.length; i++) {
                if (positions[i].x - positions[i - 1].x !== 1) {
                    return false;
                }
            }
        }
        else {
            for (let i = 1; i < positions.length; i++) {
                if (positions[i].y - positions[i - 1].y !== 1) {
                    return false;
                }
            }
        }
        return true;
    }
    /**
     * Get the span (range) of coordinates along an axis.
     * Returns an array of all coordinates from min to max.
     */
    static getSpan(coordinates) {
        if (coordinates.length === 0) {
            throw new Error('Cannot get span of empty coordinate set');
        }
        const axis = this.getAxis(coordinates);
        if (!axis) {
            throw new Error('Coordinates not aligned on same axis');
        }
        const sorted = this.sortByAxis(coordinates, axis);
        const start = sorted[0];
        const end = sorted[sorted.length - 1];
        const startPos = this.deserialize(start);
        const endPos = this.deserialize(end);
        const all = [];
        if (axis === 'horizontal') {
            for (let x = startPos.x; x <= endPos.x; x++) {
                all.push(this.serialize(x, startPos.y));
            }
        }
        else {
            for (let y = startPos.y; y <= endPos.y; y++) {
                all.push(this.serialize(startPos.x, y));
            }
        }
        return {
            start,
            end,
            allCoordinates: all,
        };
    }
    /**
     * Check if coordinate is valid (must have both x and y as integers).
     */
    static isValid(coordinate) {
        if (typeof coordinate !== 'string')
            return false;
        const parts = coordinate.split(',');
        if (parts.length !== 2)
            return false;
        const xPart = parts[0];
        const yPart = parts[1];
        if (xPart === undefined || yPart === undefined)
            return false;
        const x = parseInt(xPart, 10);
        const y = parseInt(yPart, 10);
        return !isNaN(x) && !isNaN(y) && Number.isInteger(x) && Number.isInteger(y);
    }
}
export default CoordinateUtil;
//# sourceMappingURL=Coordinate.js.map