# Paymaster
This paymaster contract is used for paying user's fees in any ERC20 token. All logic is implemented in validateAndPayForPaymasterTransaction function, that will be called automaticaly when a user sends any kind of transaction and passes additional parameters for paymaster.

Example of using this paymaster is in scripts/paymasterFunctionality.test.ts.

Run this file with command:
    `yarn test scripts/paymasterFunctionality.test.ts`

# PostOpFunction.test
The postOp() function is called after transaction successfully processed by paymaster. But this function along results to CALL_EXCEPTION sometimes. This test demonstrates both cases (successfull postOp and the one that results in CALL_EXCEPTION).

Test flow:
1. write into storage within function validateAndPayForPaymasterTransaction (make sure you are following the rules for writing into the storage at this place!). For example mapping[_to][from] += something.
2. attempt to write within `function postOp` . For example: mapping[_to][from] -= something

Issue: CALL_EXCEPTION is triggered.

There are 2 Paymaster implementation for this test in contracts/testPaymaster: PaymasterPostOpSuccess.sol and PaymasterPostOpFail.sol. In the first one 224 bytes of data is stored of data and it's working correctly, in another contract I tried to store (225 bytes) into `test` mapping and it fails witn CALL_EXEPTION error.

This tests are written in scripts/postOpFunction.test.ts. There are two cases (with success and fail accordingly)

Run this test with command:
    `yarn test scripts/postOpFunction.test.ts`

# WriteStorageAfterStateApplied.test
In this test I try to save data to the storage from within validateAndPayForPaymasterTransaction function after the state of transaction is applied.
I.e. after this line:
```
    (bool success, ) = payable(BOOTLOADER_FORMAL_ADDRESS).call{
        value: requiredETH
    }("");
    require(success, "Paymaster: Failed to transfer funds to the bootloader");
```

Like in previous test, it's possible to write in storage from there, but only 160 or less bytes of data.
This rule also applies for writing into storage even before tx state is applied. The error that is triggered in this cases is `CALL_EXCEPTION`.

Tests for this issue are in scripts/validateAndPayFunction.test.ts
Run this test with command:
    `yarn test scripts/validateAndPayFunction.test.ts`

# Important
Looks like 160-224 bytes is a value that you can store in your paymaster's storage in sum from both postOp and validateAndPay functions.

# EstimateGasForPaymaster.test
NOTE! It works correctly in this case now (it was not working as of Nov 10th 2022...).

In this test I got data from paymaster through another contract. This is function from test contract which gets data stored within paymaster `validateAndPayForPaymasterTransaction` function and then read within TestContract function. When TestContract contains require() that validates data set in the Paymaster, gas estimation fails.
```
    function checkPaymasterValue(address paymasterAddress) external {
        value = IPaymasterEstimateGasError(paymasterAddress).getValue(address(this));
        require(value == 18, "This is the value that was set in Paymaster");
    }
```

Tests for this issue are in scripts/estimateGasForPaymaster.test.ts

Run this test with command:
    `yarn test scripts/estimateGasForPaymaster.test.ts`
