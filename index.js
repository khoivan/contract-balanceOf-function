const http = require("http"),
  Contract = require("web3-eth-contract");
Contract.setProvider("https://data-seed-prebsc-1-s3.binance.org:8545");
const contract = new Contract([
  {
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
]);
async function balanceHandler(t) {
  if (!t.wallet || !t.tokens || "object" != typeof t.tokens)
    throw Error("input invalid");
  let promisese = [];
  let tokenArr = [];
  for (let token of t.tokens) {
    if (tokenArr.indexOf(token) > -1) continue;

    tokenArr.push(token);
    if ("coin" == token) {
      promisese.push(
        new Promise((resolve, reject) => {
          contract.currentProvider.send(
            {
              jsonrpc: "2.0",
              method: "eth_getBalance",
              params: [t.wallet, "latest"],
              id: 2,
            },
            (t, n) => {
              if (t) return reject(t);
              resolve(parseInt(n.result).toString());
            }
          );
        })
      );
    } else {
      contract.options.address = token;
      promisese.push(
        await contract.methods
          .balanceOf(t.wallet)
          .call({ from: t.wallet, gas: 3e6 })
      );
    }
  }

  let allData = await Promise.all(promisese);
  let mapData = {};
  for (let i = 0; i < tokenArr.length; i++) {
    mapData[tokenArr[i]] = allData[i];
  }

  // sort
  const sortable = Object.entries(mapData)
    .sort(([, a], [, b]) => Number(a) - Number(b))
    .reverse()
    .reduce((r, [k, v]) => ({ ...r, [k]: v }), {});
  return JSON.stringify(sortable);
}
http
  .createServer(async (t, e) => {
    if ("OPTIONS" === t.method) {
      e.writeHead(204, headers), e.end();
      return;
    }
    let a = [];
    for await (let n of t) a.push(n);
    let r = Buffer.concat(a).toString();
    try {
      let c = await balanceHandler(JSON.parse(r));
      e.writeHead(200), e.write(c);
    } catch (o) {
      e.writeHead(500), e.write("ERR: " + o.message);
    }
    e.end();
  })
  .listen(8080);
