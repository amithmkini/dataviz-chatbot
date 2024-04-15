type NumericArray = number[];

function mean(data: NumericArray): number {
    return data.reduce((sum, value) => sum + value, 0) / data.length;
}

function standardDeviation(data: NumericArray): number {
    const mu: number = mean(data);
    const squareDiffs: NumericArray = data.map(value => (value - mu) ** 2);
    return Math.sqrt(squareDiffs.reduce((sum, value) => sum + value, 0) / data.length);
}

function pearsonCorrelation(data1: NumericArray, data2: NumericArray): number {
    const mean1: number = mean(data1);
    const mean2: number = mean(data2);
    const sd1: number = standardDeviation(data1);
    const sd2: number = standardDeviation(data2);

    const covariance: number = data1.map((x, i) => (x - mean1) * (data2[i] - mean2))
                            .reduce((sum, value) => sum + value, 0) / data1.length;

    return covariance / (sd1 * sd2);
}

export function calculateCorrelationMatrix(data: NumericArray[]): number[][] {
    let matrix: number[][] = [];
    for (let i = 0; i < data.length; i++) {
        matrix[i] = [];
        for (let j = 0; j < data.length; j++) {
            matrix[i][j] = i === j ? 1 : pearsonCorrelation(data[i], data[j]);
        }
    }
    return matrix;
}