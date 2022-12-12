// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IPaymasterEstimateGasError{
    function getValue(address target) external view returns(uint256);
}