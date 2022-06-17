import { JsonRpcProvider } from '@ethersproject/providers';
import {
  Button,
  Card,
  Container,
  Grid,
  Spacer,
  Image,
  Text,
  Loading,
} from '@nextui-org/react';
import WalletConnectProvider from '@walletconnect/web3-provider/dist/umd/index.min.js';
import { BigNumber, ethers } from 'ethers';
import { LayoutGroup, motion } from 'framer-motion';
import { useCallback, useEffect, useState } from 'react';
import Web3Modal from 'web3modal';
import confetti from 'canvas-confetti';

const duration = 120 * 1000;
const animationEnd = Date.now() + duration;
const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

function randomInRange(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

const fireConfetti = () => {
  const interval: ReturnType<typeof setInterval> = setInterval(function () {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return clearInterval(interval);
    }

    const particleCount = 50 * (timeLeft / duration);
    // since particles fall down, start a bit higher than random
    confetti(
      Object.assign({}, defaults, {
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      }),
    );
    confetti(
      Object.assign({}, defaults, {
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      }),
    );
  }, 250);
};

const shortenAddress = (address: string, length = 8) => {
  if (!address || typeof address !== 'string') {
    return '';
  }
  return `${address.slice(0, Math.max(0, length))}...${address.substring(
    address.length - (length - 2),
    address.length - 1,
  )}`;
};

const web3Modal = new Web3Modal({
  theme: 'dark',
  providerOptions: {
    walletconnect: {
      package: WalletConnectProvider,
      options: {
        infuraId: 'aw',
      },
    },
  },
});

const SMOLEGENDS_CONTRACT = '0x4A679253410272dd5232B3Ff7cF5dbB88f295319';
const SMOLEGENDS_ABI = [
  'function mintSmolegend()',
  'function totalSupply() view returns(uint256)',
  'function tokenURI(uint256 id) view returns(string)',
  'event Minted(uint256 id)',
];
const readOnlyContract = new ethers.Contract(
  SMOLEGENDS_CONTRACT,
  SMOLEGENDS_ABI,
  new JsonRpcProvider('http://127.0.0.1:8545'),
  // ethers.getDefaultProvider(),
);

const App = () => {
  const [provider, setProvider] = useState<ethers.providers.Provider>();
  const [totalSupply, setTotalSupply] = useState(0);
  const [mintedId, setMintedId] = useState(0);
  const [mintedImage, setMintedImage] = useState('');
  const [minting, setMinting] = useState(false);
  const [account, setAccount] = useState('');
  const [signer, setSigner] = useState<ethers.Signer>();

  const fetchTotalSupply = useCallback(async () => {
    setInterval(async () => {
      const supply = (await readOnlyContract.totalSupply()) as BigNumber;
      setTotalSupply(supply.toNumber());
    }, 100_000);
  }, []);

  const fetchTokenUri = useCallback(async () => {
    if (!mintedId) {
      return;
    }

    const metadata = (await readOnlyContract.tokenURI(mintedId)) as string;

    const parsed = JSON.parse(
      atob(metadata.replaceAll('data:application/json;base64,', '')),
    );
    setMintedImage(parsed.image);
  }, [mintedId]);

  useEffect(() => {
    fetchTokenUri();
  }, [fetchTokenUri, mintedId]);

  useEffect(() => {
    fetchTotalSupply();
  }, [fetchTotalSupply]);

  const connect = useCallback(async () => {
    const provider = await web3Modal.connect();
    const web3Provider = new ethers.providers.Web3Provider(provider);
    setProvider(web3Provider);

    const signer = web3Provider.getSigner();
    setSigner(signer);

    const address = await signer.getAddress();
    setAccount(address);
  }, []);

  const mint = useCallback(async () => {
    setMinting(true);

    try {
      const contract = new ethers.Contract(
        SMOLEGENDS_CONTRACT,
        SMOLEGENDS_ABI,
        signer,
      );
      const res = await contract.mintSmolegend();
      const receipt: ethers.ContractReceipt = await res.wait();

      const mintedId = receipt?.events?.find((e) => e.event === 'Minted')?.args
        ?.id as BigNumber;

      setMintedId(mintedId.toNumber());
      fireConfetti();
      // eslint-disable-next-line no-empty
    } catch {}
    setMinting(false);
  }, [signer]);

  console.log(mintedImage);

  return (
    <Container fluid className="app">
      <Grid.Container css={{ height: '70vh' }}>
        <Grid xs={12} md={7}>
          <Card
            css={{
              padding: '50px',
              backdropFilter: 'saturate(180%) blur(20px)',
              bg: 'rgba(0, 0, 0)',
            }}
          >
            <Grid.Container
              direction="column"
              css={{ dflex: 'center', height: '100%', textAlign: 'center' }}
            >
              <Grid css={{ fd: 'column', height: '65%' }}>
                <Image
                  showSkeleton
                  src="/smolegends.png"
                  alt="Smolegends Logo"
                />
                <Text
                  h1
                  css={{
                    textGradient: '45deg, $blue500 -20%, $pink500 50%',
                  }}
                  weight="bold"
                >
                  {totalSupply}
                  <Text span css={{ fs: '30px' }}>
                    /10000 Minted
                  </Text>
                </Text>
              </Grid>

              <Grid
                css={{
                  dflex: 'center',
                  ai: 'start',
                  height: '35%',
                  fd: 'column',
                }}
              >
                {account && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1, transitionDuration: '.2s' }}
                    style={{ width: '100%' }}
                  >
                    <Text
                      css={{
                        textGradient: '45deg, $blue500 -20%, $pink500 50%',
                      }}
                      weight="bold"
                    >
                      Connected: {account ? shortenAddress(account) : ''}
                    </Text>
                  </motion.div>
                )}
                <Spacer y={1} />
                {account && !mintedId && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1, transitionDuration: '.2s' }}
                    exit={{ opacity: 0 }}
                  >
                    <Button
                      size="xl"
                      shadow
                      bordered
                      color="gradient"
                      onClick={async () => {
                        await mint();
                      }}
                    >
                      {minting ? (
                        <>
                          Minting
                          <Loading type="points" color="white" size="sm" />
                        </>
                      ) : (
                        'Mint'
                      )}
                    </Button>
                  </motion.div>
                )}

                {mintedId ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1, transitionDuration: '.2s' }}
                    exit={{ opacity: 0 }}
                  >
                    <Button
                      size="xl"
                      shadow
                      color="gradient"
                      onClick={async () => {}}
                    >
                      Stake your Smolegend here
                    </Button>
                  </motion.div>
                ) : (
                  ''
                )}

                {!account && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1, transitionDuration: '.2s' }}
                    exit={{ opacity: 0 }}
                    className="card"
                  >
                    <Button
                      size="xl"
                      bordered
                      color="primary"
                      onClick={async () => {
                        await connect();
                      }}
                    >
                      Connect Wallet
                    </Button>
                  </motion.div>
                )}
              </Grid>
            </Grid.Container>
          </Card>
        </Grid>
        <Grid xs={12} md={5}>
          <Card css={{ dflex: 'center' }}>
            <img
              src={mintedImage}
              alt="Smolegend"
              style={{ maxHeight: '700px' }}
            />
          </Card>
        </Grid>
      </Grid.Container>
    </Container>
  );
};

export default App;
