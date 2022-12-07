import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { Provider, utils, Wallet } from 'zksync-web3';
import EthCrypto from 'eth-crypto';
import { Deployer } from '@matterlabs/hardhat-zksync-deploy';
import { privateKey } from "../network_keys/secrets.json";
import * as ethers from 'ethers';
import * as hre from 'hardhat';
import { expect } from 'chai';
const { idText } = require("typescript");

describe("PostOp() tests", function(){
    const EMPTY_WALLET_PRIVATE_KEY = '0x55be7573ee287faa02e0c4d360306798224d01ab3db7853c8ba111e772f2d798';
    const TOKEN_ADDRESS = '0x8249e89324ff308fBDcb9b911f9f270F3C0846CE';
    const TESTCONTRACT_ADDRESS = '0x4c1Dd9bc204AAC20a0A17C5e254226Ca49a932B5';
    
    let testContract: ethers.ethers.Contract;
    let erc20: ethers.ethers.Contract;
    let emptyWallet: Wallet;
    let wallet: Wallet;

    let paymasterPostOpSuccess: ethers.ethers.Contract;
    let paymasterPostOpFail: ethers.ethers.Contract;

    let PAYMASTER_TEST_SUCCESS_ADDRESS: string;
    let PAYMASTER_TEST_FAIL_ADDRESS: string;

    let sessionID = 1;
    
    const privateKeyIssuer = 'e3ad95aa7e9678e96fb3d867c789e765db97f9d2018fca4068979df0832a5178';
    const testIssuerAddress  = '0x84a5B4B863610989197C957c8816cF6a3B91adD2';

    const provider = new Provider(hre.config.zkSyncDeploy.zkSyncNetwork);
    const depositAmount = ethers.utils.parseEther('1');

    it("Deploy Paymaster and PaymasterPostOpTest", async function(){         
        wallet = new Wallet(privateKey, provider);

        // The wallet that will receive ERC20 tokens
        emptyWallet = new Wallet(EMPTY_WALLET_PRIVATE_KEY, provider);

        const deployer = new Deployer(hre, wallet);

        // Get the ERC20 token
        const artifact = hre.artifacts.readArtifactSync('TestToken');
        erc20 = new ethers.Contract(TOKEN_ADDRESS, artifact.abi, emptyWallet);


        // Deploying the test paymaster success
        const paymasterPostOpTestSuccessArtifact = await deployer.loadArtifact('PaymasterPostOpSuccess');
        paymasterPostOpSuccess = await deployer.deploy(paymasterPostOpTestSuccessArtifact, [wallet.address]);
        PAYMASTER_TEST_SUCCESS_ADDRESS = paymasterPostOpSuccess.address;
        const ISSUER_ROLE = await paymasterPostOpSuccess.ISSUER_ROLE.call();

        await(await paymasterPostOpSuccess.grantRole(ISSUER_ROLE, testIssuerAddress)).wait();

        console.log(`Test paymaster address: ${PAYMASTER_TEST_SUCCESS_ADDRESS}`);

        // Deploying the test paymaster fail
        const paymasterPostOpTestArtifact = await deployer.loadArtifact('PaymasterPostOpFail');
        paymasterPostOpFail = await deployer.deploy(paymasterPostOpTestArtifact, [wallet.address]);
        PAYMASTER_TEST_FAIL_ADDRESS = paymasterPostOpFail.address;

        await(await paymasterPostOpFail.grantRole(ISSUER_ROLE, testIssuerAddress)).wait();

        console.log(`Test paymaster address: ${PAYMASTER_TEST_FAIL_ADDRESS}`);


        // Get test contact
        const testContractArtifact = await hre.artifacts.readArtifactSync('TestContract');
        testContract = new ethers.Contract(TESTCONTRACT_ADDRESS, testContractArtifact.abi, emptyWallet);
    })
    
    it('Use PaymasterPostOp for approve (success)', async function(){
        console.log("Write into stroga from postOp function 112 bytes of data");
        
        let paymasterParams = await preparePaymasterParams(0, emptyWallet.address, PAYMASTER_TEST_SUCCESS_ADDRESS);
        // Estimate gas for approve transaction
        let gasPrice = await provider.getGasPrice();
        console.log(`Approve gasPrice = ${gasPrice}`);

        // Estimate gas fee for approve transaction
        let gasLimit = await erc20.estimateGas.approve(testContract.address, depositAmount, {
            customData: {
            ergsPerPubdata: utils.DEFAULT_ERGS_PER_PUBDATA_LIMIT,
            paymasterParams: {
                paymaster: paymasterParams.paymaster,
                paymasterInput: paymasterParams.paymasterInput,
            },
            },
        });
        console.log(`Approve gasLimit = ${gasLimit}`);
        
        let fee = gasPrice.mul(gasLimit.toString());
        console.log("approve fee = ", ethers.utils.formatEther(fee));
        let valueToSend = fee.add(ethers.utils.parseEther('0.0001'));
        
        await fundPaymaster(hre, provider, valueToSend, PAYMASTER_TEST_SUCCESS_ADDRESS);
        
        await(
            (
            await erc20.approve(testContract.address, depositAmount, {
                // provide gas params manually
                maxFeePerGas: gasPrice,
                maxPriorityFeePerGas: gasPrice,
                gasLimit,
            
                // paymaster info
                customData: {
                    paymasterParams,
                    ergsPerPubdata: utils.DEFAULT_ERGS_PER_PUBDATA_LIMIT,
                },
            })
            ).wait()
        );
        console.log("Approve succeded");
    })

    it('Use PaymasterPostOp for approve (fail)', async function(){
        console.log("Write into stroga from postOp function 113 bytes of data");
        
        let paymasterParams = await preparePaymasterParams(0, emptyWallet.address, PAYMASTER_TEST_FAIL_ADDRESS);
        // Estimate gas for approve transaction
        let gasPrice = await provider.getGasPrice();
        console.log(`Approve gasPrice = ${gasPrice}`);

        // Estimate gas fee for approve transaction
        let gasLimit = await erc20.estimateGas.approve(testContract.address, depositAmount, {
            customData: {
            ergsPerPubdata: utils.DEFAULT_ERGS_PER_PUBDATA_LIMIT,
            paymasterParams: {
                paymaster: paymasterParams.paymaster,
                paymasterInput: paymasterParams.paymasterInput,
            },
            },
        });
        console.log(`Approve gasLimit = ${gasLimit}`);
        
        let fee = gasPrice.mul(gasLimit.toString());
        console.log("approve fee = ", ethers.utils.formatEther(fee));
        let valueToSend = fee.add(ethers.utils.parseEther('0.0001'));
        
        await fundPaymaster(hre, provider, valueToSend, PAYMASTER_TEST_FAIL_ADDRESS);
        
        await expect (
            (
            await erc20.approve(testContract.address, depositAmount, {
                // provide gas params manually
                maxFeePerGas: gasPrice,
                maxPriorityFeePerGas: gasPrice,
                gasLimit,
            
                // paymaster info
                customData: {
                    paymasterParams,
                    ergsPerPubdata: utils.DEFAULT_ERGS_PER_PUBDATA_LIMIT,
                },
            })
            ).wait()
        ).to.be.rejectedWith("CALL_EXCEPTION");

        console.log("Approve failed cause you tried to write into storage more than 112 bytes");
    })

    const fundPaymaster = async (hre: HardhatRuntimeEnvironment, provider, valueToSend, paymasterAddress:string) => {
        console.log(`Funding Paymaster for ${ethers.utils.formatEther(valueToSend)} ETH`);
        const wallet = new Wallet(privateKey, provider);
        const deployer = new Deployer(hre, wallet);
        await (
        await deployer.zkWallet.sendTransaction({
            to: paymasterAddress,
            value: valueToSend,
        })
        ).wait();
    }

    const preparePaymasterParams = async (ruleID:number, senderAddress:string, paymasterAddress:string) => {
        //prepare package
        let currentTime = Math.round((new Date()).getTime()/1000);
        //   @param data - signed data package from the off-chain verifier
        //   data[0] - verification session ID
        //   data[1] - circuit ID (if required)
        //   data[2] - verification timestamp
        //   data[3] - verified wallet - to be the same as msg.sender
        console.log(`Input: ruleID = ${ruleID} senderAddress = ${senderAddress}`)
        let ardata = [ethers.BigNumber.from(sessionID++), ethers.BigNumber.from(ruleID), ethers.BigNumber.from(currentTime), ethers.BigNumber.from(senderAddress)];
        
        let message = [{
                type: "uint256",
                value: ardata[0].toString()
            },
            {
                type: "uint256",
                value: ardata[1].toString()
            },
            {
                type: "uint256",
                value: ardata[2].toString()
            },
            {
                type: "uint256",
                value: ardata[3].toString()
            }
        ];

        let signature = await signMessage(message, privateKeyIssuer);

        let paramsPacked = ethers.utils.defaultAbiCoder.encode([ "uint[4]", "bytes" ], [ ardata, signature ]);
        let paymasterParams = utils.getPaymasterParams(paymasterAddress, {
        type: 'General',
        innerInput: paramsPacked,
        });
    return paymasterParams;
    }

    async function signMessage(message, privateKeyWallet) {
        const publicKeySigner = EthCrypto.publicKeyByPrivateKey(privateKeyWallet);
        const signerAddress = EthCrypto.publicKey.toAddress(publicKeySigner);

        const signerIdentity = {
            privateKey: privateKeyWallet,
            publicKey: publicKeySigner,
            address: signerAddress
        };
        const messageHash = EthCrypto.hash.keccak256(message);
        const signature = EthCrypto.sign(signerIdentity.privateKey, messageHash);
        return signature;
    }

})