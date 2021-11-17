import React, { useState, useEffect } from "react";
import { Fragment } from "react";
import AddCloth from "./AddCloth";
import Header from "./Header";
import Shop from "./Shop";

import Web3 from "web3";
import { newKitFromWeb3 } from "@celo/contractkit";
import BigNumber from "bignumber.js";

import wear from "./contracts/wear.abi.json";
import erc20 from "./contracts/IERC.abi.json";

const ERC20_DECIMALS = 18;

const contractAddress = "0x46178FeB4e08589978a0e1c440fBB0A0A8EB2A64";
const cUSDContractAddress = "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1";

function App() {
  const [contract, setcontract] = useState(null);
  const [address, setAddress] = useState(null);
  const [kit, setKit] = useState(null);
  const [cUSDBalance, setcUSDBalance] = useState(0);
  const [clothes, setClothes] = useState([])

  const connectCeloWallet = async () => {
    if (window.celo) {
      // notification("⚠️ Please approve this DApp to use it.")
      try {
        await window.celo.enable();
        // notificationOff()
        const web3 = new Web3(window.celo);
        let kit = newKitFromWeb3(web3);

        const accounts = await kit.web3.eth.getAccounts();
        const user_address = accounts[0];

        kit.defaultAccount = user_address;

        await setAddress(user_address);

        await setKit(kit);
      } catch (error) {
        console.log("There is an error");
        console.log({ error });
        // notification(`⚠️ ${error}.`)
      }
    } else {
      console.log("please install the extension");
      // notification("⚠️ Please install the CeloExtensionWallet.")
    }
  };

  const getBalance = async () => {
    const balance = await kit.getTotalBalance(address);
    const USDBalance = balance.cUSD.shiftedBy(-ERC20_DECIMALS).toFixed(2);

    const contract = new kit.web3.eth.Contract(wear, contractAddress);
    setcontract(contract);
    setcUSDBalance(USDBalance);
  };

  useEffect(() => {
    connectCeloWallet();
  }, []);

  useEffect(() => {
    if (kit && address) {
      return getBalance();
    } else {
      console.log("no kit or address");
    }
  }, [kit, address]);

  useEffect(() => {
    if (contract) {
      getClothes();
    }
  }, [contract]);


  const getClothes = async function () {
    const clothLength = await contract.methods.getClothLength().call();
    const _cloths = [];

    for (let index = 0; index < clothLength; index++) {
      let _cloth = new Promise(async (resolve, reject) => {
        let c = await contract.methods.getCloth(index).call();
        resolve({
          index: index,
          owner: c[0],
          name: c[1],
          description: c[2],
          image: c[3],
          price: c[4],
          isUsed: c[5],
        });
      });

      _cloths.push(_cloth);
    }
    const cloths = await Promise.all(_cloths);

    setClothes(cloths);

  };

  const buyCloth = async (_index, _price)=>{
    try {
      const cUSDContract = new kit.web3.eth.Contract(erc20, cUSDContractAddress);
      const cost = new BigNumber(_price).shiftedBy(ERC20_DECIMALS).toString();

      await cUSDContract.methods
        .approve(contractAddress, cost)
        .send({ from: address });

      await contract.methods.buyCloth(_index).send({ from: address });
      // return result
      getBalance();
      getClothes();
    } catch (error) {
      console.log({ error });
    }
  }
  const addCloth = async (_name, _description, _image, _price, _isUsed) => {
    try {
      const price = new BigNumber(_price)
        .shiftedBy(ERC20_DECIMALS).toString();


      await contract.methods
        .addCloth(
          _name,
          _description,
          _image,
          price,
          _isUsed, 
          
        )
        .send({ from: address });
      getClothes();
    } catch (error) {
      console.log(error);
    }

  }
  return (
    <Fragment>
      <Header balance={cUSDBalance} />
      <Shop clothes = {clothes} buyCloth = {buyCloth}/>
      <AddCloth addCloth = {addCloth}/>
    </Fragment>
  );
}



export default App;
