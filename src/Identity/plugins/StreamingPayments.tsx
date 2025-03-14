import React, { useEffect, Suspense } from "react";
import { DataGrid, GridColDef, GridValueGetterParams } from '@mui/x-data-grid';
import moment from 'moment';
import { Global } from '@emotion/react';
import { Link, useParams, useSearchParams } from "react-router-dom";
// @ts-ignore
import { Signer, Connection, PublicKey, SystemProgram, Transaction, TransactionInstruction } from '@solana/web3.js';
import {ENV, TokenInfo, TokenListProvider} from '@solana/spl-token-registry';
import { useWallet } from '@solana/wallet-adapter-react';
import { useSnackbar } from 'notistack';

import { styled } from '@mui/material/styles';

import {
    Button,
    ButtonGroup,
    Stack,
    Typography,
    Grid,
    Box,
    Container,
    Skeleton,
    Avatar,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    FormControl,
    IconButton,
    TextField,
    List,
    ListItem,
    ListItemAvatar,
    ListItemIcon,
    ListItemText,
    ListItemButton,
    Tooltip,
    SwipeableDrawer,
    CssBaseline,
    Tab,
    Hidden,
    Badge,
    LinearProgress,
    CircularProgress,
} from '@mui/material';

import CloseIcon from '@mui/icons-material/Close';
import SettingsIcon from '@mui/icons-material/Settings';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import DownloadingIcon from '@mui/icons-material/Downloading';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import OpacityIcon from '@mui/icons-material/Opacity';

import {
    StreamClient,
    Stream,
    CreateParams,
    CreateMultiParams,
    WithdrawParams,
    TransferParams,
    TopupParams,
    CancelParams,
    GetAllParams,
    StreamDirection,
    StreamType,
    Cluster,
    TxResponse,
    CreateResponse,
    BN,
    getBN,
    getNumberFromBN,
} from "@streamflow/stream";

import { GRAPE_RPC_ENDPOINT, THEINDEX_RPC_ENDPOINT, GRAPE_PROFILE, GRAPE_PREVIEW, DRIVE_PROXY } from '../../utils/grapeTools/constants';
import { load } from "../../browser";
import { PanoramaVerticalSelect } from "@mui/icons-material";
import { trimAddress } from "../../utils/grapeTools/WalletAddress";

function secondsToHms(d:number) {
    d = Number(d);
    var h = Math.floor(d / 3600);
    var m = Math.floor(d % 3600 / 60);
    var s = Math.floor(d % 3600 % 60);

    var hDisplay = h > 0 ? h + (h == 1 ? " hour " : " hours ") : "";
    var mDisplay = m > 0 ? m + (m == 1 ? " minute " : " minutes ") : "";
    var sDisplay = s > 0 ? s + (s == 1 ? " second" : " seconds") : "";
    return hDisplay + mDisplay + sDisplay; 
}

const BootstrapDialog = styled(Dialog)(({ theme }) => ({
    '& .MuDialogContent-root': {
      padding: theme.spacing(2),
    },
    '& .MuDialogActions-root': {
      padding: theme.spacing(1),
    },
  }));
  
  export interface DialogTitleProps {
    id: string;
    children?: React.ReactNode;
    onClose: () => void;
  }
  
  const BootstrapDialogTitle = (props: DialogTitleProps) => {
    const { children, onClose, ...other } = props;
  
    return (
      <DialogTitle sx={{ m: 0, p: 2 }} {...other}>
        {children}
        {onClose ? (
          <IconButton
            aria-label="close"
            onClick={onClose}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: (theme) => theme.palette.grey[500],
            }}
          >
            <CloseIcon />
          </IconButton>
        ) : null}
      </DialogTitle>
    );
  };

export function StreamingPaymentsView(props: any){
    const setLoadingPosition = props.setLoadingPosition;
    const pubkey = props.pubkey;
    const tokenMap = props.tokenMap;
    const [selectionModel, setSelectionModel] = React.useState(null);
    const [streamingPayments, setStreamingPayments] = React.useState(null);
    const [streamingPaymentsRows, setStreamingPaymentsRows] = React.useState(null);
    const [loadingStreamingPayments, setLoadingStreamingPayments] = React.useState(false);
    const wallet = useWallet();
    
    const { publicKey, sendTransaction } = useWallet();
    const connection = new Connection(GRAPE_RPC_ENDPOINT);
    const { enqueueSnackbar, closeSnackbar } = useSnackbar();

    function TransferStreamComponent(props:any){
        const streamName = props.streamName;
        const streamId = props.streamId;
        const [openTransfer, setTransferOpen] = React.useState(false);
        const [toAddress, setToAddress] = React.useState(null);

        const handleClickTransferOpen = () => {
            setTransferOpen(true);
        };
        const handleTransferClose = () => {
            setTransferOpen(false);
        };
        function HandleSendSubmit(event: any) {
            event.preventDefault();
            if (toAddress){
                if ((toAddress.length >= 32) && 
                    (toAddress.length <= 44)){ // very basic check / remove and add twitter handle support (handles are not bs58)
                    transferStream(streamId, toAddress)
                    handleTransferClose();
                } else{
                    // Invalid Wallet ID
                    enqueueSnackbar(`Enter a valid Wallet Address!`,{ variant: 'error' });
                    console.log("INVALID WALLET ID");
                }
            } else{
                enqueueSnackbar(`Enter a valid Wallet Address!`,{ variant: 'error' });
            }
        }
        
        return (
            <>
                <Tooltip title="Transfer this stream">
                    <Button
                        variant="outlined" 
                        onClick={handleClickTransferOpen}
                        >
                        Transfer
                    </Button>
                </Tooltip>
                <BootstrapDialog
                    onClose={handleTransferClose}
                    aria-labelledby="customized-dialog-title"
                    open={openTransfer}
                    PaperProps={{
                        style: {
                            boxShadow: '3',
                            borderRadius: '17px',
                            },
                        }}
                >
                    <form onSubmit={HandleSendSubmit}>
                        <BootstrapDialogTitle id="customized-dialog-title" onClose={handleTransferClose}>
                            Transfer Stream
                        </BootstrapDialogTitle>
                        <DialogContent dividers>
                            <FormControl>
                                <Grid container spacing={2}>
                                        <>
                                            <Grid item xs={12} textAlign={'left'} sx={{mt:1}}>
                                                <Typography variant="caption">
                                                    Stream: {streamId}
                                                </Typography>
                                                <br/>
                                                <Typography variant="caption">
                                                    Name: {streamName}
                                                </Typography>
                                            </Grid>
                                            <Grid item xs={12} textAlign={'center'} sx={{mt:1}}>
                                                <Typography variant="body1">
                                                    Enter the Solana address you would like to transfer this stream to
                                                </Typography>
                                            </Grid>
                                            <Grid item xs={12}>
                                                <TextField 
                                                    id="send-to-address" 
                                                    fullWidth 
                                                    placeholder="Enter a Solana address" 
                                                    label="To address" 
                                                    variant="standard"
                                                    autoComplete="off"
                                                    onChange={(e) => {setToAddress(e.target.value)}}
                                                    InputProps={{
                                                        inputProps: {
                                                            style: {
                                                                textAlign:'center'
                                                            }
                                                        }
                                                    }}
                                                />
                                            </Grid>
                                        </>
                                
                                </Grid>
                            </FormControl>
                        </DialogContent>
                        <DialogActions>
                            <Button     
                                fullWidth
                                type="submit"
                                variant="outlined" 
                                title="Transfer"
                                disabled={
                                    (!toAddress || toAddress.length <= 0)
                                }
                                sx={{
                                    borderRadius:'17px'
                                }}>
                                Transfer
                            </Button>
                        </DialogActions>
                    </form>
                </BootstrapDialog>
            </>
        );
    }

    const StreamPaymentClient = new StreamClient(
        GRAPE_RPC_ENDPOINT, // "https://api.mainnet-beta.solana.com",
        Cluster.Mainnet,
        "confirmed"
    );

    React.useEffect(() => {
        if (pubkey){
            fetchStreamingPayments();
        }
    }, [pubkey]);

    const streamingcolumns: GridColDef[] = [
        { field: 'id', headerName: 'ID', width: 70, hide: true },
        { field: 'source', headerName: 'Source', width: 150,
            renderCell: (params) => {
                return(
                    <>
                        <Avatar alt={params.value} src={params.value.logoURI} sx={{ width: 20, height: 20, bgcolor: 'rgb(0, 0, 0)', mr:1 }}>
                            {params.value.name.substr(0,2)}
                        </Avatar>
                        {params.value.name}
                    </>
                )
            }
        },
        { field: 'direction', headerName: 'Direction', width: 75, align: 'center',
        renderCell: (params) => {
            return(
                <>
                    {pubkey === params.value.recipient ?
                        <>
                            {pubkey === params.value.sender &&
                                <></>
                            }
                            <><Tooltip title="Incoming"><Button><ArrowDownwardIcon color="success" /></Button></Tooltip></>
                        </>
                    :
                        <><Tooltip title="Outgoing"><Button><ArrowUpwardIcon sx={{color:'red'}} /></Button></Tooltip></>
                    }
                </>
            )
        }
        },
        { field: 'mint', headerName: 'Mint', width: 150, align: 'center',
            renderCell: (params) => {
                return(
                    <>
                        <Avatar alt={params.value} src={tokenMap.get(params.value).logoURI} sx={{ width: 20, height: 20, bgcolor: 'rgb(0, 0, 0)', mr:1 }}>
                            {params.value.substr(0,2)}
                        </Avatar>
                        {tokenMap.get(params.value).name}
                    </>
                )
            }
        },
        { field: 'name', headerName: 'Name', minWidth: 200, flex: 1, align: 'left' },
        { field: 'sender', headerName: 'Sender', width: 100, align: 'center',
            renderCell: (params) => {
                return(
                    <>
                        {trimAddress(params.value,4)}
                    </>
                );
            }
        },
        { field: 'recipient', headerName: 'Recipient', width: 100, align: 'center',
            renderCell: (params) => {
                return(
                    <>
                        {trimAddress(params.value,4)}
                    </>
                );
            }
        },
        { field: 'depositedAmount', headerName: 'Total', width: 130, align: 'center',
            renderCell: (params) => {
                return(
                    <>
                        {+params.value.depositedAmount/(10 ** tokenMap.get(params.value.mint)?.decimals)} {tokenMap.get(params.value.mint)?.symbol}
                    </>
                );
            }
        },
        { field: 'withdrawnAmount', headerName: 'Withdrawn', width: 130, align: 'center',
            renderCell: (params) => {
                return(
                    <>
                        {+params.value.withdrawnAmount/(10 ** tokenMap.get(params.value.mint)?.decimals)} {tokenMap.get(params.value.mint)?.symbol}
                    </>
                );
            }
        },
        { field: 'remainingAmount', headerName: 'Balance', width: 130, align: 'center',
            renderCell: (params) => {
                return(
                    <>
                        {(+params.value.depositedAmount/(10 ** tokenMap.get(params.value.mint)?.decimals) - +params.value.withdrawnAmount/(10 ** tokenMap.get(params.value.mint)?.decimals)).toFixed(2)} {tokenMap.get(params.value.mint)?.symbol}
                    </>
                );
            }
        },
        { field: 'availableWithdraw', headerName: 'Available', width: 130, align: 'center',
            renderCell: (params) => {
                return(
                    <>
                        {params.value.availableToWithdraw} {tokenMap.get(params.value.mint)?.symbol}
                        {/*(Math.floor(moment(Date.now()).diff(moment.unix(params.value.lastWithdrawnAt), 'seconds')/params.value.withdrawalFrequency) * +params.value?.amountPerPeriod)/(10 ** tokenMap.get(params.value.mint)?.decimals)} {tokenMap.get(params.value.mint)?.symbol*/}
                    </>
                );
            }
        },
        { field: 'amountPerPeriod', headerName: 'Payout Period', width: 200, align: 'center',
            renderCell: (params) => {
                return(
                    <>
                        <Typography variant='body2' color='#FF5733'>
                        {+params.value.amountPerPeriod/(10 ** tokenMap.get(params.value.mint)?.decimals)} {tokenMap.get(params.value.mint)?.symbol} <OpacityIcon sx={{fontSize:'14px'}} /> / {secondsToHms(params.value.period)}
                        </Typography>
                    </>
                );
            }
        },
        { field: 'createdAt', headerName: 'Created', width: 200, align: 'center',
            renderCell: (params) => {
                return(
                    <>
                    {+params.value !== 0 ?
                        <Typography variant='caption'>
                            {moment.unix(+params.value).format("MMMM Do YYYY, h:mm a")}
                        </Typography>
                    :
                        <></>
                    }
                    </>
                )
            }
        },
        { field: 'canceledAt', headerName: 'Canceled', width: 200, align: 'center',
            renderCell: (params) => {
                return(
                    <>
                    {+params.value !== 0 ?
                        <Typography variant='caption'>
                            {moment.unix(+params.value).format("MMMM Do YYYY, h:mm a")}
                        </Typography>
                    :
                        <></>
                    }
                    </>
                )
            }
        },
        { field: 'start', headerName: 'Start Date', width: 200, align: 'center',
            renderCell: (params) => {
                return(
                    <>
                    {+params.value !== 0 ?
                        <Typography variant='caption'>
                            {moment.unix(+params.value).format("MMMM Do YYYY, h:mm a")}
                        </Typography>
                    :
                        <></>
                    }
                    </>
                )
            }
        },
        { field: 'end', headerName: 'End Date', width: 200, align: 'center',
            renderCell: (params) => {
                return(
                    <>
                    {+params.value !== 0 ?
                        <Typography variant='caption'>
                            {moment.unix(+params.value).format("MMMM Do YYYY, h:mm a")}
                        </Typography>
                    :
                        <></>
                    }
                    </>
                )
            }
        },
        { field: 'lastWithdrawnAt', headerName: 'Last Withdraw', width: 200, align: 'center',
            renderCell: (params) => {
                return(
                    <>
                        {+params.value !== 0 &&
                            <Typography variant='caption'>
                                {moment.unix(+params.value).format("MMMM Do YYYY, h:mm a")}
                            </Typography>
                        }
                    </>
                )
            }
        },
        { field: 'withdrawalFrequency', headerName: 'withdrawalFrequency', width: 200, align: 'center', hide: true,
            renderCell: (params) => {
                return(
                    <>
                        {secondsToHms(+params.value)}
                    </>
                );
            } 
        },
        { field: 'transferableByRecipient', headerName: 'Transferable', width: 100, align: 'center', hide: true, 
            renderCell: (params) => {
                return(
                    <>  
                        {params.value ?
                            <CheckCircleIcon sx={{color:'#FF5733'}} />
                        :
                            <CancelIcon sx={{color:'red'}} />
                        }
                    </>
                )
            }
        },
        { field: 'manage', headerName: '', width: 270,  align: 'center',
            renderCell: (params) => {
                //const withdrawRaw = (Math.floor(moment(Date.now()).diff(moment.unix(params.value.lastWithdrawnAt), 'seconds')/params.value.withdrawalFrequency) * +params.value?.amountPerPeriod);
                const availableToWithdraw = getBN(params.value.availableToWithdraw, tokenMap.get(params.value.mint)?.decimals);
                const balance = (+params.value.depositedAmount/(10 ** tokenMap.get(params.value.mint)?.decimals) - +params.value.withdrawnAmount/(10 ** tokenMap.get(params.value.mint)?.decimals));
                
                return (
                    <>
                    {publicKey && pubkey === publicKey.toBase58() ?
                        <>
                            {pubkey === params.value.recipient ?
                                <ButtonGroup>
                                    {(params.value.canceledAt === null || params.value.canceledAt === 0) &&
                                    <>
                                        <Tooltip title="Withdraw unlocked balance">
                                            <Button
                                                disabled={(params.value.availableToWithdraw > 0 && balance > 0) ? false : true}
                                                variant='outlined'
                                                size='small'
                                                onClick={(e) => withdrawStream(params.value.id, availableToWithdraw)}
                                                sx={{borderTopLeftRadius:'17px',borderBottomLeftRadius:'17px'}}
                                            >Withdraw</Button>
                                        </Tooltip>
                                        {(params.value?.transferableByRecipient === true && balance > 0) &&
                                            <TransferStreamComponent streamId={params.value.id} streamName={params.value.name} />
                                        }
                                    </>
                                    }
                                    {params.value?.cancelableByRecipient === true &&
                                        <Tooltip title="Cancel this stream">
                                            <Button
                                                variant='outlined'
                                                size='small'
                                                color="error"
                                                onClick={(e) => cancelStream(params.value.id)}
                                            ><CloseIcon /></Button>
                                        </Tooltip>
                                    }

                                    <Tooltip title="Manage this stream">
                                        <Button
                                            variant='outlined'
                                            size='small'
                                            component='a'
                                            href={`https://app.streamflow.finance/all-streams`}
                                            target='_blank'
                                            sx={{borderTopRightRadius:'17px',borderBottomRightRadius:'17px'}}
                                        >
                                            <SettingsIcon />
                                        </Button>
                                    </Tooltip>
                                </ButtonGroup>
                            :
                                <>
                                {params.value?.cancelableBySender === true && (params.value.canceledAt === null || params.value.canceledAt === 0) &&
                                
                                    <Tooltip title="Cancel this stream">
                                        <Button
                                            variant='outlined'
                                            size='small'
                                            color="error"
                                            onClick={(e) => cancelStream(params.value.id)}
                                            sx={{borderRadius:'17px'}}
                                        ><CloseIcon /></Button>
                                    </Tooltip>
                                }

                                    <Tooltip title="Manage this stream">
                                        <Button
                                            variant='outlined'
                                            size='small'
                                            component='a'
                                            href={`https://app.streamflow.finance/all-streams`}
                                            target='_blank'
                                            sx={{borderRadius:'17px'}}
                                        >
                                            <SettingsIcon />
                                        </Button>
                                    </Tooltip>
                                </>
                            }
                        </>
                    :
                        <></>
                    }
                    </>
                )
            }
        },
        
      ];

      async function transferStream(stream:string, recipientId: string) {
        
        const data = {
            invoker: wallet, // Wallet/Keypair signing the transaction.
            id: stream, // Identifier of a stream to be withdrawn from.
            recipientId: recipientId, // Identifier of a stream to be transferred.
        };
        
        try {
            
            enqueueSnackbar(`Preparing to transfer stream to ${recipientId}`,{ variant: 'info' });
            const { tx } = await StreamPaymentClient.transfer(data);
            const signedTransaction = tx;

            const snackprogress = (key:any) => (
                <CircularProgress sx={{padding:'10px'}} />
            );
            const cnfrmkey = enqueueSnackbar(`Confirming transaction`,{ variant: 'info', action:snackprogress, persist: true });
            const latestBlockHash = await connection.getLatestBlockhash();
            await connection.confirmTransaction({
                blockhash: latestBlockHash.blockhash,
                lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
                signature: signedTransaction}, 
                'processed'
            );
            closeSnackbar(cnfrmkey);
            const action = (key:any) => (
                    <Button href={`https://explorer.solana.com/tx/${signedTransaction}`} target='_blank'  sx={{color:'white'}}>
                        Signature: {signedTransaction}
                    </Button>
            );
            enqueueSnackbar(`Transfer complete`,{ variant: 'success', action });
            try{
                //refresh...
                fetchStreamingPayments();
            }catch(err:any){console.log("ERR: "+err)}
        }catch(e:any){
            enqueueSnackbar(e.message ? `${e.name}: ${e.message}` : e.name, { variant: 'error' });
        }   
    }

    async function cancelStream(stream:string) {
        
        const withdrawStreamParams = {
            invoker: wallet, // Wallet/Keypair signing the transaction.
            id: stream, // Identifier of a stream to be withdrawn from.
        };

        try {
            enqueueSnackbar(`Preparing to withdraw`,{ variant: 'info' });
            const { ixs, tx } = await StreamPaymentClient.cancel(withdrawStreamParams);
            
            const snackprogress = (key:any) => (
                <CircularProgress sx={{padding:'10px'}} />
            );
            
            const cnfrmkey = enqueueSnackbar(`Confirming transaction`,{ variant: 'info', action:snackprogress, persist: true });
            //await connection.confirmTransaction(signature, 'processed');
            const latestBlockHash = await connection.getLatestBlockhash();
            await connection.confirmTransaction({
                blockhash: latestBlockHash.blockhash,
                lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
                signature: tx}, 
                'processed'
            );
            closeSnackbar(cnfrmkey);
            const action = (key:any) => (
                    <Button href={`https://explorer.solana.com/tx/${tx}`} target='_blank'  sx={{color:'white'}}>
                        Signature: {tx}
                    </Button>
            );
            
            enqueueSnackbar(`Stream canceled`,{ variant: 'success', action });
            try{
                //refresh...
                fetchStreamingPayments();
            }catch(err:any){console.log("ERR: "+err)}
        }catch(e:any){
            enqueueSnackbar(e.message ? `${e.name}: ${e.message}` : e.name, { variant: 'error' });
        }   
    }

      async function withdrawStream(stream:string, amount:BN) {
        
        //const unlocked = streamingPayments.unlocked;
        //console.log("unlocked: "+JSON.stringify(unlocked));

        const withdrawStreamParams = {
            invoker: wallet, // Wallet/Keypair signing the transaction.
            id: stream, // Identifier of a stream to be withdrawn from.
            amount: amount, // Requested amount to withdraw. If stream is completed, the whole amount will be withdrawn.
        };

        console.log("withdrawStreamParams: "+(withdrawStreamParams.id)+" - "+withdrawStreamParams.amount)
        
        try {
            enqueueSnackbar(`Preparing to withdraw`,{ variant: 'info' });
            //const { ixs, tx } = await StreamPaymentClient.topup(withdrawStreamParams);
            const { ixs, tx } = await StreamPaymentClient.withdraw(withdrawStreamParams);
            
            const snackprogress = (key:any) => (
                <CircularProgress sx={{padding:'10px'}} />
            );
            const cnfrmkey = enqueueSnackbar(`Confirming transaction`,{ variant: 'info', action:snackprogress, persist: true });
            //await connection.confirmTransaction(signature, 'processed');
            const latestBlockHash = await connection.getLatestBlockhash();
            await connection.confirmTransaction({
                blockhash: latestBlockHash.blockhash,
                lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
                signature: tx}, 
                'processed'
            );
            closeSnackbar(cnfrmkey);
            const action = (key:any) => (
                    <Button href={`https://explorer.solana.com/tx/${tx}`} target='_blank'  sx={{color:'white'}}>
                        Signature: {tx}
                    </Button>
            );
            
            enqueueSnackbar(`Withdraw complete`,{ variant: 'success', action });
            try{
                //refresh...
                fetchStreamingPayments();
            }catch(err:any){console.log("ERR: "+err)}
        }catch(e:any){
            enqueueSnackbar(e.message ? `${e.name}: ${e.message}` : e.name, { variant: 'error' });
        }   
    }

      const fetchStreamingPayments = async () => {
        setLoadingStreamingPayments(true);
        setLoadingPosition('Streaming Payments');
        
        try {
            const streams = await StreamPaymentClient.get({
                wallet: new PublicKey(pubkey), // Wallet signing the transaction.
                type: StreamType.All, // (optional) Type, default is StreamType.All
                direction: StreamDirection.All, // (optional) Direction, default is StreamDirection.All)
            });
            
            if (streams){
                const streamingTable = new Array();
                for (var item of streams){
                    console.log("item: "+JSON.stringify(item))
                    const currentTimeStamp = Date.now();
                    const timestampInSeconds = Math.floor(+new Date / 1000);

                    const deposited = +item[1].depositedAmount / (10 ** tokenMap.get(item[1].mint)?.decimals)

                    let availableToWithdraw = 0;

                    if (timestampInSeconds < item[1].cliff) {
                        availableToWithdraw = 0;
                    } else if (timestampInSeconds > item[1].end) {
                        availableToWithdraw = deposited;
                    } else{
                        const streamedBN = item[1].cliffAmount.add(
                            new BN(Math.floor((timestampInSeconds - item[1].cliff) / item[1].period)).mul(
                                item[1].amountPerPeriod
                            )
                        );
                        const streamed = +streamedBN / (10 ** tokenMap.get(item[1].mint)?.decimals);
                        const available = (+streamedBN - +item[1].withdrawnAmount) / (10 ** tokenMap.get(item[1].mint)?.decimals);
                        //console.log("streamed: "+streamed);
                        console.log("available to withdraw: "+available);

                        if (available < deposited) 
                            availableToWithdraw = available
                        else 
                            availableToWithdraw = deposited;
                    }

                    var name = item[1].name;
                    try{
                        name = decodeURIComponent(item[1].name);
                    }catch(ern){
                        console.log("ERR: "+ern)
                    }

                    streamingTable.push({
                        id:item[0],
                        name:item[1].name,
                        sender:item[1].sender,
                        recipient:item[1].recipient,
                        source:{
                            name:'Streamflow',
                            logoURI:'https://shdw-drive.genesysgo.net/5VhicqNTPgvJNVPHPp8PSH91YQ6KnVAeukW1K37GJEEV/Streamflow-Logo-SIgn-White@2x.png'
                        },
                        direction:{
                            sender:item[1].sender,
                            recipient:item[1].recipient
                        },
                        mint:item[1].mint,
                        depositedAmount:{
                            depositedAmount:item[1].depositedAmount,
                            mint:item[1].mint,
                        },
                        withdrawnAmount:{
                            withdrawnAmount:item[1].withdrawnAmount,
                            mint:item[1].mint,
                        },
                        remainingAmount:{
                            depositedAmount:item[1].depositedAmount,
                            withdrawnAmount:item[1].withdrawnAmount,
                            mint:item[1].mint,
                        },
                        availableWithdraw:{
                            mint:item[1].mint,
                            lastWithdrawnAt:item[1].lastWithdrawnAt,
                            withdrawalFrequency:item[1].withdrawalFrequency,
                            amountPerPeriod:item[1].amountPerPeriod,
                            availableToWithdraw:availableToWithdraw,
                        },
                        amountPerPeriod:{
                            mint:item[1].mint,
                            amountPerPeriod:item[1].amountPerPeriod,
                            period:item[1].period,
                            depositedAmount:item[1].depositedAmount
                        },
                        createdAt:item[1].createdAt,
                        canceledAt:item[1].canceledAt,
                        start:item[1].start,
                        end:item[1].end,
                        lastWithdrawnAt:item[1].lastWithdrawnAt,
                        withdrawalFrequency:item[1].withdrawalFrequency,
                        transferableByRecipient:item[1].transferableByRecipient,
                        manage:{
                            id:item[0],
                            mint:item[1].mint,
                            name:item[1].name,
                            transferableByRecipient:item[1].transferableByRecipient,
                            depositedAmount: item[1].depositedAmount,
                            withdrawnAmount: item[1].withdrawnAmount,
                            lastWithdrawnAt:item[1].lastWithdrawnAt,
                            withdrawalFrequency:item[1].withdrawalFrequency,
                            amountPerPeriod:item[1].amountPerPeriod,
                            canceledAt:item[1].canceledAt,
                            cancelableByRecipient:item[1].cancelableByRecipient,
                            cancelableBySender:item[1].cancelableBySender,
                            availableToWithdraw:availableToWithdraw,
                            sender:item[1].sender,
                            recipient:item[1].recipient
                        }
                    });
                    
                }
                setStreamingPayments(streams);
                setStreamingPaymentsRows(streamingTable);
                setLoadingStreamingPayments(false);
            }
            //console.log("streams: "+JSON.stringify(streams))
        } catch (exception) {
            // handle exception
        }


        setLoadingStreamingPayments(false);
    }

    return (
        <>
        {loadingStreamingPayments ?
            <LinearProgress />
        :
            <>
                {streamingPayments && streamingPaymentsRows &&
                    <div style={{ height: 600, width: '100%' }}>
                        <div style={{ display: 'flex', height: '100%' }}>
                            <div style={{ flexGrow: 1 }}>
                                {publicKey && publicKey.toBase58() === pubkey ?
                                    <DataGrid
                                        rows={streamingPaymentsRows}
                                        columns={streamingcolumns}
                                        pageSize={25}
                                        rowsPerPageOptions={[]}
                                        onSelectionModelChange={(newSelectionModel) => {
                                            setSelectionModel(newSelectionModel);
                                        }}
                                        initialState={{
                                            sorting: {
                                                sortModel: [{ field: 'domain', sort: 'desc' }],
                                            },
                                        }}
                                        sx={{
                                            borderRadius:'17px',
                                            borderColor:'rgba(255,255,255,0.25)',
                                            '& .MuiDataGrid-cell':{
                                                borderColor:'rgba(255,255,255,0.25)'
                                            }}}
                                        sortingOrder={['asc', 'desc', null]}
                                        disableSelectionOnClick
                                    />
                                :
                                    <DataGrid
                                        rows={streamingPaymentsRows}
                                        columns={streamingcolumns}
                                        initialState={{
                                            sorting: {
                                                sortModel: [{ field: 'domain', sort: 'desc' }],
                                            },
                                        }}
                                        sx={{
                                            borderRadius:'17px',
                                            borderColor:'rgba(255,255,255,0.25)',
                                            '& .MuiDataGrid-cell':{
                                                borderColor:'rgba(255,255,255,0.25)'
                                            }}}
                                        pageSize={25}
                                        rowsPerPageOptions={[]}
                                    />
                                }
                            </div>
                        </div>
                    </div>
                }
                </>
            }
        </>

    )
}