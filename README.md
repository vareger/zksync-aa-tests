# Paymaster
This paymaster contract is used for paying user's fees in any ERC20 token. All logic is implemented in validateAndPayForPaymasterTransaction function, that will be called automaticaly when user send any kind of transaction and pass aditional parameters for paymaster.

Example of using this paymaster is shown in scripts/paymasterFunctionality.test.ts. 

Run this file with command:
    `yarn test scripts/paymasterFunctionality.test.ts` 

# PostOpFunction.test
This test is about checking possibility of writing data to the storage from postOp function.
Answering the main question, it is possible but depands from amount of data that has to be stored. 

In contracts/testPaymaster are two files PaymasterPostOpSuccess.sol and PaymasterPostOpFail.sol. In the first one I store 112 bytes of data and it's working correctly, in another contract I tried to store (133 bytes) into testMapping and it fails witn CALL_EXEPTION error.
So you can store only 112 bytes of any data into the storage.

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

Like in previous test, it's possible to write in storage from there, but only 122 or less bytes of data. 
This rule also applies for writing into storage even before tx state is applied. The error that is triggered in this cases is `CALL_EXCEPTION`.

Tests for this issue are in scripts/validateAndPayFunction.test.ts
Run this test with command:
    `yarn test scripts/validateAndPayFunction.test.ts`

# Important
112 bytes is a value that you can store in your paymaster's storage in sum from both postOp and validateAndPay functions.

# EstimateGusForPaymaster.test
In this test I got data from paymaster through another contract. It works correctly in my case. This is function from test contract which gets data from paymaster contract and stores it into this test contract
```
    function checkPaymasterValue(address paymasterAddress) external {
        value = IPaymasterEstimateGasError(paymasterAddress).value();
    }
```
I can estimate gas for this function fine, it doesn`t trigger any problem. And runs with paymaster also great.

Tests for this issue are in scripts/estimateGusForPaymaster.test.ts
Run this test with command:
    `yarn test scripts/estimateGusForPaymaster.test.ts`


