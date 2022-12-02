pragma solidity >=0.8.0;

import "./interfaces/IPaymasterEstimateGasError.sol";
import "hardhat/console.sol";

contract TestContract{
    uint256 public value;

    constructor(uint256 _baseValue){
        value = _baseValue;
    }

    function regularContractFunction(uint256 testValue) external {
        value = testValue;
    }

    function checkPaymasterValue(address paymasterAddress) external {
        value = IPaymasterEstimateGasError(paymasterAddress).value();
    }
}