// TODO: move to @polymedia/suitcase-core

import { chunkArray } from "@polymedia/suitcase-core";

/**
 * Process inputs in batches, where batches are executed serially,
 * and operations within each batch are executed in parallel.
 *
 * @param batchSize Maximum number of parallel operations per batch
 * @param inputs Array of inputs to process
 * @param operation Function to process each input
 * @returns Array of results for each batch
 */
export async function serialBatchesOfParallelOperations<Input, Output>(
    batchSize: number,
    inputs: Input[],
    operation: (input: Input, idx: number) => Promise<Output>,
): Promise<Output[]>
{
    const results: Output[][] = [];
    const batches = chunkArray(inputs, batchSize);

    for (const [batchNum, batchInputs] of batches.entries()) {
        console.debug(`[serialBatchesOfParallelOperations] processing batch ${batchNum + 1} of ${batches.length}`);
        const batchResults = await Promise.all(batchInputs.map(operation));
        results.push(batchResults);
    }

    return results.flat();
}
