import {
    Connection,
    Keypair,
} from "@solana/web3.js";
import base58 from "bs58";
import dotnet from 'dotenv'
import { commitment, PUMP_FUN_PROGRAM } from "./constants";
import { convertHttpToWebSocket, formatDate } from "./utils/commonFunc";

import WebSocket = require("ws");
import buyToken from "./pumputils/utils/buyToken";
dotnet.config();


const rpc = process.env.RPC_ENDPOINT;
console.log("🚀 ~ rpc:", rpc)
const payer = process.env.PRIVATE_KEY;
console.log("🚀 ~ payer:", payer)
const devwallet = process.env.DEV_WALLET_ADDRESS;
console.log("🚀 ~ devwallet:", devwallet)
const buyamount = process.env.BUY_AMOUNT;
console.log("🚀 ~ buyamount:", buyamount)
const title = `
██████╗ ██╗   ██╗███╗   ███╗██████╗ ███████╗██╗   ██╗███╗   ██╗    ███████╗███╗   ██╗██╗██████╗ ███████╗██████╗ 
██╔══██╗██║   ██║████╗ ████║██╔══██╗██╔════╝██║   ██║████╗  ██║    ██╔════╝████╗  ██║██║██╔══██╗██╔════╝██╔══██╗
██████╔╝██║   ██║██╔████╔██║██████╔╝█████╗  ██║   ██║██╔██╗ ██║    ███████╗██╔██╗ ██║██║██████╔╝█████╗  ██████╔╝
██╔═══╝ ██║   ██║██║╚██╔╝██║██╔═══╝ ██╔══╝  ██║   ██║██║╚██╗██║    ╚════██║██║╚██╗██║██║██╔═══╝ ██╔══╝  ██╔══██╗
██║     ╚██████╔╝██║ ╚═╝ ██║██║     ██║     ╚██████╔╝██║ ╚████║    ███████║██║ ╚████║██║██║     ███████╗██║  ██║
╚═╝      ╚═════╝ ╚═╝     ╚═╝╚═╝     ╚═╝      ╚═════╝ ╚═╝  ╚═══╝    ╚══════╝╚═╝  ╚═══╝╚═╝╚═╝     ╚══════╝╚═╝  ╚═╝
                                                                                                                     
`;








const tokenDevWalletSniper = async (rpcEndPoint: string, payer: string, solIn: number, devAddr: string) => {

    console.log(title);
    try {
        const payerKeypair = Keypair.fromSecretKey(base58.decode(payer));
        let isBuying = false;
        const connection = new Connection(rpcEndPoint, { wsEndpoint: convertHttpToWebSocket(rpcEndPoint), commitment: "confirmed" });
        const logConnection = new Connection(rpcEndPoint, { wsEndpoint: convertHttpToWebSocket(rpcEndPoint), commitment: "confirmed" });
        let globalLogListener: any;

        // Function to stop the listener
        const stopListener = async () => {
            if (globalLogListener !== undefined) {
                try {
                    await logConnection.removeOnLogsListener(globalLogListener);
                    isBuying = true
                } catch (err) {
                    console.log("Error stopping listener:", err);
                }
            }
        };
        globalLogListener = logConnection.onLogs(
            PUMP_FUN_PROGRAM,
            async ({ logs, err, signature }) => {
                if (err) return
                const isMint = logs.filter(log => log.includes("MintTo")).length;
                if (isMint && !isBuying) {
                    const parsedTransaction = await logConnection.getParsedTransaction(signature, { maxSupportedTransactionVersion: 0, commitment: "confirmed" });
                    if (!parsedTransaction) {
                        return;
                    }
                    console.log("new signature => ", `https://solscan.io/tx/${signature}`, await formatDate());
                    console.time('sig')
                    let dev = parsedTransaction?.transaction.message.accountKeys[0].pubkey.toString();

                    // if (dev === devAddr) return;

                    console.log("Dev wallet => ", `https://solscan.io/address/${dev}`);
                    const mint = parsedTransaction?.transaction.message.accountKeys[1].pubkey;
                    console.log('New token => ', `https://solscan.io/token/${mint.toString()}`)
                    await stopListener()
                    isBuying = true;
                    console.log('Going to start buying =>')
                    console.timeEnd('sig');
                    const sig = await buyToken(mint, connection, payerKeypair, solIn, 1);
                    if (!sig) {
                        isBuying = false;
                    } else {
                        console.log('buy success')

                    }

                }
            },
            commitment
        );


    } catch (err) {
        console.log(err);
        return { stopListener: undefined };
    }
};


export const runBot = () => {
    const isGeyser = process.env.IS_GEYSER === 'true';
    if (isGeyser) {
        console.log('Geyser mode selected!');
    } else {
        console.log("Common Mode selected!");
        tokenDevWalletSniper(rpc!, payer!, Number(buyamount!), devwallet!)
    }
    console.log("🚀 ~ runBot ~ isGeyser:", isGeyser)
}

runBot()