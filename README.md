# Paymaster
This paymaster contract is used for paying user's fees in any ERC20 token. All logic is implemented in validateAndPayForPaymasterTransaction function, that will be called automaticaly when user will send any kind of transaction and pass aditional parameters for paymaster.

Example of using this paymaster is shown in scripts/paymasterFunctionality.test.ts. 

Run this file with command:
    `yarn test scripts/paymasterFunctionality.test.ts` 

# PostOpFunction.test
This test is about checking possibility of writing data to the storage from postOp function.
Answering the main question, it is possible but depands from amount of data that has to be stored. 

In contracts/testPaymaster are two files PaymasterPostOpSuccess.sol and PaymasterPostOpFail.sol. In the first one I store uint256 data (`1` for example) and it's working correctly, in another contract I tried to store input variable into testMapping and it fails witn CALL_EXEPTION error.

This tests are written in scripts/postOpFunction.test.ts. There are two cases (with success and fail accordingly)

Run this test with command:
    `yarn test scripts/postOpFunction.test.ts`

# WriteStorageAfterStateApplied.test
In this test I try to storage data from validateAndPayForPaymasterTransaction function after the state of transaction is applied. 
after this lines:
```
    (bool success, ) = payable(BOOTLOADER_FORMAL_ADDRESS).call{
        value: requiredETH
    }("");
    require(success, "Paymaster: Failed to transfer funds to the bootloader");
```

Like in previous test, it's possible to write in storage from there, but only small amounts of data (possible to write '1' but not input variable). This rule also applies for writing into storage even before tx state is applied. The error that is triggered in this cases is `SERVER_ERROR`  and it works correctly if I write into storage small amount of data or don`t write any additional data at all.

Tests for this issue are in scripts/writeStorageAfterStateApplied.test.ts
Run this test with command:
    `yarn test scripts/writeStorageAfterStateApplied.test.ts`

