import { Provider, utils, Wallet } from 'zksync-web3';
import * as ethers from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { Deployer } from '@matterlabs/hardhat-zksync-deploy';
import { privateKey } from "../network_keys/secrets.json";

export default async function (hre: HardhatRuntimeEnvironment) {
    const provider = new Provider(hre.config.zkSyncDeploy.zkSyncNetwork);
  
    const wallet = new Wallet(privateKey, provider);
  
    // The wallet that will receive ERC20 tokens
    const emptyWallet = Wallet.createRandom();

    console.log(`Empty wallet's address: ${emptyWallet.address}`);
    console.log(`Empty wallet's private key: ${emptyWallet.privateKey}`);
  
    const deployer = new Deployer(hre, wallet);
  
    // Deploying the ERC20 token
    const erc20Artifact = await deployer.loadArtifact('TestToken');
    const erc20 = await deployer.deploy(erc20Artifact, [
      'TestToken',
      'TT',
      18,
    ]);
    console.log(`ERC20 address: ${erc20.address}`);


    // Deploying the paymaster
    const paymasterArtifact = await deployer.loadArtifact('Paymaster');
    const paymaster = await deployer.deploy(paymasterArtifact, [wallet.address]);

    const ISSUER_ROLE = await paymaster.ISSUER_ROLE.call();
    const testIssuerAddress  = '0x84a5B4B863610989197C957c8816cF6a3B91adD2';
    await(await paymaster.grantRole(ISSUER_ROLE, testIssuerAddress)).wait(); //test issuer

    let isIssuer = await paymaster.hasRole(ISSUER_ROLE, testIssuerAddress);
    console.log(`Issuer Role for ${testIssuerAddress} = ${isIssuer.toString()}`);
    console.log(`Paymaster address: ${paymaster.address}`);

    // Deploying test contact
    const testContractArtifact = await deployer.loadArtifact('TestContract');
    const testContract = await deployer.deploy(testContractArtifact, [erc20.address]);
    console.log(`TestContract address: ${testContract.address}`);

    let balanceToken = await erc20.balanceOf(emptyWallet.address);
    if(balanceToken.isZero()){
        await (await erc20.mint(emptyWallet.address, ethers.utils.parseEther('100'))).wait();
        console.log('Minted 100 tokens to the wallet ',emptyWallet.address);
    }
    else{
        console.log("empty walle balance",balanceToken.toString());
    }

    console.log(`Done!`);
}