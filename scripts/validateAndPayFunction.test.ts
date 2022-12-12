import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { Provider, utils, Wallet } from 'zksync-web3';
import EthCrypto from 'eth-crypto';
import { Deployer } from '@matterlabs/hardhat-zksync-deploy';
import { privateKey } from "../network_keys/secrets.json";
import * as ethers from 'ethers';
import * as hre from 'hardhat';
import { expect } from 'chai';
const { idText } = require("typescript");

describe("Paymaster`s validateAndPay function test", function(){
    const EMPTY_WALLET_PRIVATE_KEY = '0x55be7573ee287faa02e0c4d360306798224d01ab3db7853c8ba111e772f2d798';
    const TOKEN_ADDRESS = '0x8249e89324ff308fBDcb9b911f9f270F3C0846CE';
    const TESTCONTRACT_ADDRESS = '0x4c1Dd9bc204AAC20a0A17C5e254226Ca49a932B5';

    let testContract: ethers.ethers.Contract;
    let erc20: ethers.ethers.Contract;
    let emptyWallet: Wallet;
    let wallet: Wallet;


    let paymasterSuccess: ethers.ethers.Contract;
    let paymasterFail: ethers.ethers.Contract;

    let PAYMASTER_SUCCESS_ADDRESS: string;
    let PAYMASTER_FAIL_ADDRESS: string;

    let sessionID = 1;
    
    const privateKeyIssuer = 'e3ad95aa7e9678e96fb3d867c789e765db97f9d2018fca4068979df0832a5178';
    const testIssuerAddress  = '0x84a5B4B863610989197C957c8816cF6a3B91adD2';

    const provider = new Provider(hre.config.zkSyncDeploy.zkSyncNetwork);
    const depositAmount = ethers.utils.parseEther('1');

    it("Deploy Paymaster and PaymasterPostOpTest", async function(){         
        wallet = new Wallet(privateKey, provider);
        emptyWallet = new Wallet(EMPTY_WALLET_PRIVATE_KEY, provider);// The wallet that will receive ERC20 tokens

        const deployer = new Deployer(hre, wallet);

        const artifact = hre.artifacts.readArtifactSync('TestToken');
        erc20 = new ethers.Contract(TOKEN_ADDRESS, artifact.abi, emptyWallet);

        // Deploying the success paymaster
        const paymasterSuccessArtifact = await deployer.loadArtifact('PaymasterValidateAndPaySuccess');
        paymasterSuccess = await deployer.deploy(paymasterSuccessArtifact, [wallet.address]);
        PAYMASTER_SUCCESS_ADDRESS = paymasterSuccess.address;

        const ISSUER_ROLE = await paymasterSuccess.ISSUER_ROLE.call();
        await(await paymasterSuccess.grantRole(ISSUER_ROLE, testIssuerAddress)).wait();

        console.log(`Succesfull paymaster address: ${PAYMASTER_SUCCESS_ADDRESS}`);

        // Deploying the fail paymaster
        const paymasterFailArtifact = await deployer.loadArtifact('PaymasterValidateAndPayFail');
        paymasterFail = await deployer.deploy(paymasterFailArtifact, [wallet.address]);
        PAYMASTER_FAIL_ADDRESS = paymasterFail.address;

        await(await paymasterFail.grantRole(ISSUER_ROLE, testIssuerAddress)).wait();

        console.log(`Succesfull paymaster address: ${PAYMASTER_FAIL_ADDRESS}`);

        const testContractArtifact = await hre.artifacts.readArtifactSync('TestContract');
        testContract = new ethers.Contract(TESTCONTRACT_ADDRESS, testContractArtifact.abi, emptyWallet);
    })

    it('Write into storage 160 bytes of data from validateAndPay function', async function(){
        let paymasterParams = await preparePaymasterParams(0, emptyWallet.address, PAYMASTER_SUCCESS_ADDRESS);
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
        console.log("Approve fee = ", ethers.utils.formatEther(fee));
        let valueToSend = fee.add(ethers.utils.parseEther('0.0001'));
        
        await fundPaymaster(hre, provider, valueToSend, PAYMASTER_SUCCESS_ADDRESS);
        
        await (
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
        ).wait();   
        console.log("Approve succeded");   
    })

    it('Write into storage 162 bytes of data from validateAndPay function', async function(){
        let paymasterParams = await preparePaymasterParams(0, emptyWallet.address, PAYMASTER_FAIL_ADDRESS);
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
        console.log("Approve fee = ", ethers.utils.formatEther(fee));
        let valueToSend = fee.add(ethers.utils.parseEther('0.0001'));
        
        await fundPaymaster(hre, provider, valueToSend, PAYMASTER_FAIL_ADDRESS);
    
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

        console.log("Approve faild cause you tried to write into storage more than 160 bytes");
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