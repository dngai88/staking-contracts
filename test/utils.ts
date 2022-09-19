import { BigNumber } from 'ethers';
import { network, ethers } from 'hardhat';

export function expandTo18Decimals(x: number): BigNumber {
    let baseToSupportFloatNumber = 0;
    while (x % 1 !== 0) {
        x = x * 10;
        baseToSupportFloatNumber += 1;
    }
    return BigNumber.from(x).mul(BigNumber.from(10).pow(18 - baseToSupportFloatNumber));
}

export function expandToDecimals(x: number, base: number): BigNumber {
    let baseToSupportFloatNumber = 0;
    while (x % 1 !== 0) {
        x = x * 10;
        baseToSupportFloatNumber += 1;
    }
    return BigNumber.from(x).mul(BigNumber.from(10).pow(base - baseToSupportFloatNumber));
}

export function getDurationInSecondsFromDays(numberOfDays: number): number {
    return numberOfDays * 24 * 60 * 60;
}

export async function mine(increasedTime: number) {
    await network.provider.send("evm_increaseTime", [increasedTime]);
    await network.provider.send("evm_mine");
}

export async function getCurrentTime() {
    const currentBlockNumber = await ethers.provider.getBlockNumber();    
    const currentBlockInfo = await ethers.provider.getBlock(currentBlockNumber);
    return currentBlockInfo.timestamp;
}

export function withinRange(g: BigNumber, x: BigNumber, perc: number = 10000): boolean {
    return g.gte(x.sub(x.div(perc))) && g.lte(x.add(x.div(perc)));
}