const assert = require('assert');
const ganache = require('ganache-cli');
const Web3 = require('web3');
const provider = ganache.provider();
const web3 = new Web3(provider);

const { interface, bytecode } = require('../compile');

let accounts;
let contract;

beforeEach(async () => {
  accounts = await web3.eth.getAccounts();
  contract = await new web3.eth.Contract(JSON.parse(interface))
    .deploy({ data: bytecode })
    .send({ from: accounts[0], gas: '1000000' });
  contract.setProvider(provider);
});

describe('Contract', () => {
  it('deploys a contract', () => {
    assert.ok(contract.options.address);
  });

  it('allows one account to enter', async () => {
    await contract.methods.enter().send({
      from: accounts[1],
      value: web3.utils.toWei('0.02', 'ether')
    });

    const players = await contract.methods.getPlayers().call({ from: accounts[0] });

    assert.equal(accounts[1], players[0]);
    assert.equal(1, players.length);
  });

  it('allows multiple accounts to enter', async () => {
    await contract.methods.enter().send({
      from: accounts[1],
      value: web3.utils.toWei('0.02', 'ether')
    });
    await contract.methods.enter().send({
      from: accounts[2],
      value: web3.utils.toWei('0.02', 'ether')
    });
    await contract.methods.enter().send({
      from: accounts[3],
      value: web3.utils.toWei('0.02', 'ether')
    });

    const players = await contract.methods.getPlayers().call({ from: accounts[0] });

    assert.equal(accounts[1], players[0]);
    assert.equal(accounts[2], players[1]);
    assert.equal(accounts[3], players[2]);
    assert.equal(players.length, 3);
  });

  it('requires a minimum amount of ether to enter', async () => {
    try {
      await contract.methods.enter().send({
        from: accounts[1],
        value: 0
      });
      assert(false);
    } catch (err) {
      assert(err);
    }
  });

  it('only manager can call pickWinner', async () => {
    try {
      await contract.methods.pickWinner().send({ from: accounts[1] });
      assert(false);
    } catch (err) {
      assert(err);
    }
  });

  it('sends money to the winner and reset players', async () => {
    await contract.methods.enter().send({
      from: accounts[1],
      value: web3.utils.toWei('2', 'ether')
    });

    const initialBalance = await web3.eth.getBalance(accounts[1]);
    await contract.methods.pickWinner().send({ from: accounts[0] });
    const finalBalance = await web3.eth.getBalance(accounts[1]);
    const difference = finalBalance - initialBalance;
    console.log("Gas spent:", difference - 2);

    assert(difference > web3.utils.toWei('1.8', 'ether'));

    const contractBalance = await web3.eth.getBalance(contract.options.address);
    assert.equal(contractBalance, 0);

    const players = await contract.methods.getPlayers().call({ from: accounts[0] });
    assert.equal(players.length, 0);
  });
});
