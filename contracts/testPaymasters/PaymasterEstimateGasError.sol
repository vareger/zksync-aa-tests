// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
import {IPaymaster, ExecutionResult} from "@matterlabs/zksync-contracts/l2/system-contracts/interfaces/IPaymaster.sol";
import {IPaymasterFlow} from "@matterlabs/zksync-contracts/l2/system-contracts/interfaces/IPaymasterFlow.sol";
import {TransactionHelper, Transaction} from "@matterlabs/zksync-contracts/l2/system-contracts/TransactionHelper.sol";

import "@matterlabs/zksync-contracts/l2/system-contracts/Constants.sol";

import "@openzeppelin/contracts/interfaces/IERC20.sol";
import ".././interfaces/IPaymasterEstimateGasError.sol";
import ".././libraries/SignLib.sol";
import ".././libraries/BytesLib.sol";

contract PaymasterEstimateGasError is AccessControl, SignLib, IPaymaster, IPaymasterEstimateGasError{
    // uint256 public value;
    mapping (address => uint256) test;

    uint256 public totalFeeAmountPaidTroughPaymaster;

    bytes32 public constant ISSUER_ROLE = 0x0000000000000000000000000000000000000000000000000000000000009999;

    modifier onlyBootloader() {
        require(
            msg.sender == BOOTLOADER_FORMAL_ADDRESS,
            "Paymaster: Only bootloader can call this method"
        );
        // Continure execution if called from the bootloader.
        _;
    }

    constructor(address _admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
    }

    function validateAndPayForPaymasterTransaction(
        bytes32 _txHash,
        bytes32 _suggestedSignedHash,
        Transaction calldata _transaction
    ) external payable override onlyBootloader returns (bytes memory context) {
        require(
            _transaction.paymasterInput.length >= 4,
            "Paymaster: The standard paymaster input must be at least 4 bytes long"
        );

        bytes4 paymasterInputSelector = bytes4(
            _transaction.paymasterInput[0:4]
        );

        if (paymasterInputSelector == IPaymasterFlow.general.selector) {
            //unpack general() data
            (bytes memory input) = abi.decode(_transaction.paymasterInput[4:], (bytes));
            // value = input;
            (uint[4] memory data, bytes memory signature) = abi.decode(input, (uint[4], bytes));

            //get issuer address from the signature
            address issuer = recoverSigner(keccak256(abi.encodePacked(data[0], data[1], data[2], data[3])), signature);

            require(hasRole(ISSUER_ROLE, issuer), "Paymaster: Issuer signature invalid");

            address to = address(uint160(_transaction.to));
            // address from = address(uint160(_transaction.from));
            uint256 value = 18;
            test[to] = value;

            // Note, that while the minimal amount of ETH needed is tx.ergsPrice * tx.ergsLimit,
            // neither paymaster nor account are allowed to access this context variable.
            uint256 requiredETH = _transaction.ergsLimit *
                _transaction.maxFeePerErg;

            (bool success, ) = payable(BOOTLOADER_FORMAL_ADDRESS).call{
                value: requiredETH
            }("");
            require(success, "Paymaster: Failed to transfer funds to the bootloader");

        } 
        else {
            revert("Unsupported paymaster flow");
        }
    }

    function postOp(
        bytes calldata _context,
        Transaction calldata _transaction,
        bytes32 _txHash,
        bytes32 _suggestedSignedHash,
        ExecutionResult _txResult,
        uint256 _maxRefundedErgs
    ) external payable onlyBootloader {
    }

    function getValue(address target) external override view returns(uint256){
        return test[target];
    }


    receive() external payable {}
}
