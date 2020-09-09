import React, { useState, useEffect } from 'react'
import ReactTooltip from 'react-tooltip';
import {
    HashRouter as Router,
    Switch,
    Route,
    Link,
    useParams
} from "react-router-dom";
import Filecoin from './services/filecoin'
import Drand from './services/drand'
import Blockies from 'blockies-identicon'
import 'bootstrap/dist/css/bootstrap.min.css'
import './App.scss'
import asyncPool from "tiny-async-pool";
const d3 = require('d3')
const f = d3.format(',')

function getFilecoinExpectedHeight () {
    const filGenesis = (new Date("2020-08-24 22:00:00Z")).getTime()
    return Math.floor((Date.now() - filGenesis)/1000/30)
}

function App () {
    const [miners, setMiners] = useState()
    const [head, setHead] = useState()
    const [round, setRound] = useState()
    const [node, setNode] = useState('wss://lotus.jimpick.com/spacerace_api/0/node/rpc/v0')
    const [client, setFilClient] = useState(new Filecoin(node))
    const [filExpectedHeight, setFilExpectedHeight] = useState(getFilecoinExpectedHeight())
    const [spa, setSpa] = useState()

    useEffect(() => {
        const reload = async () => {
            await setHead()
            await setFilClient(new Filecoin(node))
        }

        reload()
    }, [node])

    useEffect(() => {
        if (!head) return 

        client.fetchPower(head).then(power => {
            setSpa(power)
        })
    }, [head])

    useEffect(() => {
        let mounted = true

        client.getMiners().then(res => {
            if (!mounted) return
            setMiners(res)
        })

        const fetchingHead = async () => {
            client.fetchHead().then(fetched => {
                if (!mounted) return
                console.log('new block', fetched.Height)
                setHead(fetched)
            })

            Drand().then(fetched => {
                if (!mounted) return
                console.log('new drand', fetched)
                setRound(fetched)
            })

            setFilExpectedHeight(getFilecoinExpectedHeight())
        }

        fetchingHead()

        const interval = setInterval(() => {
            fetchingHead()
        }, 30000)

        return () => {
            mounted = false
            clearInterval(interval)
        }
    }, [client])

    return (
        <Router>
            <div className='App'>
                <div className='container'>
                    <div className='row'>
                        <div className='col'>
                            <select id="" name="" onChange={e => setNode(e.target.value)} value={node}>
                                <option value='wss://lotus.jimpick.com/spacerace_api/0/node/rpc/v0'>Jim's node 0</option>
                                <option value='wss://lotus.jimpick.com/spacerace_api/1/node/rpc/v0'>Jim's node 1</option>
                                <option value='ws://www.border.ninja:12342/node/rpc/v0'>Border's node</option>
                                <option value='wss://node.glif.io/space07/lotus/rpc/v0'>Glif's node</option>
                            </select>
                            {
                                head &&
                                <>
                                    <span>Current Tipset <a href={`https://filfox.info/en/tipset/${head.Height}`}>{head.Height}</a></span>
                                    <span>Expected Tipset <a href={`https://filfox.info/en/tipset/${filExpectedHeight}`}>{filExpectedHeight}</a></span>
                                </>
                            }
                        </div>
                    </div>
                </div>
                <header className='container-fluid'>
                    <Link to="/">
                        <h1 id="logo" className='logo'><span>spacegap</span></h1>
                    </Link>
                </header>
                <Switch>
                    <Route path='/miners/:minerId'>
                        <section className='container'>
                            <Miner client={client} miners={miners} head={head} />
                        </section>
                    </Route>
                    <Route path='/full'>
                        <Full client={client} miners={miners} />
                    </Route>
                    <Route path='/'>
                        <Home miners={miners} />
                    </Route>

                </Switch>
            </div>
        </Router>
    )
}

function Full ({miners, client}) {
    const [minersDeadlines, setMinersDeadlines] = useState({})
    const [head, setHead] = useState()

    useEffect(() => {
        const fetchingHead = async () => {
            const fetched = await client.fetchHead()
            setHead(fetched)
        }
        fetchingHead()
    }, [client])


    useEffect(() => {
        let mounted = true
        if (!head) return

        const minersList = Object.keys(miners).slice(0, 50).map(d => miners[d].address)
        asyncPool(5, minersList, async minerId => {
            if (!mounted) return;
            const deadlines = await client.fetchDeadlines(minerId, head)
            if (!mounted) return;
            minersDeadlines[minerId] = deadlines
            return await setMinersDeadlines({...minersDeadlines})
        })

        return () => { mounted = false }
    }, [client, head, miners])

    return (
        <section id='LookUp' className='container'>
            Listing WindowPoSt duties of the top 50 miners.
            {miners && Object.keys(miners).slice(0, 50).map(d =>
                <div>
                    <Link to={`/miners/${miners[d].address}`}>{miners[d].address}</Link>

                    <WindowPoSt deadlines={minersDeadlines[miners[d].address]} head={head} />

                </div>
            )}
        </section>
    )
}


function Home ({miners}) {
    return (
        <section id='home' className='container'>
            <div className="spacerace">
                Top miners:
                {miners && Object.keys(miners).slice(0, 5).map((d, i) =>
                    <div>
                        {i+1}. <Link to={`/miners/${miners[d].address}`}>{miners[d].address}</Link>
                    </div>
                )}
            </div>
            <div>
                See deadlines of <Link to={`/full`}>top 50 miners</Link> or click on individual miners.
            </div>
        </section>
    )
}

const PoSt = ({ epoch, posted, skipped }) => {
    return (
        <div>
            Epoch {epoch}: {posted ? 'posted' : 'missed'}
        </div>
    )
}

const Summary = ({condition, title, desc}) => {
    return (
        <div className="summary col-sm">
            <div className="summary-title">
                {title}
            </div>
            <div className="summary-desc">
                {desc}
            </div>
        </div>
    )
}

const WindowPoSt = ({deadlines, head}) => {
    return (
        <div className="deadlines windowpost">
            {
            deadlines && deadlines.nextDeadlines.map((d, i) =>
            <div key={i} className={d.TotalSectors === 0 ? 'deadline opacity5' : 'deadline'}>

                <div className="out">
                    In {d.Close - head.Height}
                    {/* <span className="epochs">epochs</span> */}
                </div>
                <div className="hddWrapper">
                    <div className='in'>
                        {Math.round(d.TotalSectors * 32 /1024)} TiB

                    </div>
                    <div className="hdds">
                        {
                        [...Array(
                        Math.ceil(
                        Math.round(d.TotalSectors * 32 /1024 - +d.FaultyPower.Raw / (1024*1024*1024*1024))/8
                        ))].map((v, i) => <div key={i} className='hdd'></div>)
                        }
                        {
                        [...Array(Math.ceil(Math.round(+d.FaultyPower.Raw/(1024*1024*1024*1024))/8))].map((v, i) =>
                        <div key={i} className='hdd faulty'></div>
                        )
                        }

                    </div>
                </div>
                {/* <div className="partitions">
                    {
                    [...Array(Math.ceil(d.TotalSectors/2349))].map(v =>
                    <div className='partition'></div>
                    )
                    }
                </div> */}
            </div>
            )
            }

            </div>
    )
}

const Miner = ({ client, miners, head }) => {
    let { minerId } = useParams();
    const [miner, setMiner] = useState({id: minerId})

    const canvasRef = React.useRef(null)
    const [context, setContext] = React.useState(null)

    // On new (hash or head): fetch miner
    useEffect(() => {
        if (!minerId || !head) return;

        let mounted = true

        const fetchInfo = () => {
            console.log('url', client.url.slice(20), head.Cids, head.Height)
            setMiner({...miner})

            client.fetchDeadlines(minerId, head).then(deadlines => {
                if (mounted) {
                    miner.deadlines = deadlines
                    setMiner({...miner})
                }
            })
                   .catch(err => {
                       console.error(err)
                   })

            client.fetchDeposits(minerId, head).then(deposits => {
                if (mounted) {
                    miner.deposits = deposits
                    setMiner({...miner})
                }
            })

            client.fetchPreCommittedSectors(minerId, head).then(preCommits => {
                if (mounted) {
                    miner.preCommits = preCommits
                    setMiner({...miner})
                }
            })

            client.fetchSectors(minerId, head).then(sectors => {
                if (mounted) {
                    miner.sectors = sectors
                    setMiner({...miner})
                }
            })
        }

        fetchInfo()

        return () => { mounted = false }
    }, [client, head, minerId])

    useEffect(() => {
        if (canvasRef.current) {
            Blockies.render({seed: miner.id}, canvasRef.current)

            const renderCtx = canvasRef.current.getContext('2d');

            if (renderCtx) {
                setContext(renderCtx);
            }
        }
    }, [context, miner]);

    if (!miner || !head) {
        return <></>
    }

    return (
        <div>
            <div id="miner" className="section">
                {/* <span><canvas ref={canvasRef}></canvas></span> */}
                <h1>
                    {miner.id}
                </h1>
                <div>
                    {miners && miners[miner.id].tag && <span className="miner-name">{miners[miner.id].tag.en}</span>}
                    {miners && miners[miner.id].location && <span> from {miners[miner.id].location.flagEmoji}</span>}
                    &nbsp;
                    (
                    <a target='_blank' href={`https://filfox.info/en/address/${miner.id}`}>filfox</a>,&nbsp;
                        <a href={`https://filscan.io/#/tipset/address-detail?address=${miner.identicon}`}>filscan</a>,&nbsp;
                        <a href={`https://filscout.io/en/pc/account?id=${miner.id}`}>filscout</a>
                    )
                </div>
            </div>

            <div id="deposits" className="section">
                <div className='grid'>
                    {
                        miner.deposits &&
                        <Summary
                            title={f(miner.deposits.collateral || 0)}
                            desc="Collateral" />
                    }

                    {
                        miner.deposits &&
                        <Summary
                            title={f(miner.deposits.available || 0)}
                            desc="Available" />
                    }

                    {
                        miner.deposits &&
                        <Summary
                            title={f(miner.deposits.locked || 0)}
                            desc="Locked" />
                    }
                </div>
            </div>

            <div id="sectors">
                <div className='grid'>
                    {
                        miner.deadlines &&
                        <Summary
                            title={f(miner.deadlines.SectorsCount || 0)}
                            desc="Live Sectors" />
                    }
                    {
                        miner.deadlines &&
                        <Summary
                            title={f(miner.deadlines.ActiveCount || 0)}
                            desc="Active Sectors" />
                    }
                    {
                        miner.deadlines &&
                        <Summary
                            title={f(miner.deadlines.FaultsCount || 0)}
                            desc="Faulty Sectors" />
                    }
                    {
                        miner.preCommits &&
                        <Summary
                            title={f(miner.preCommits.Count || 0)}
                            desc="PreCommits" />
                    }
                </div>
            </div>

            <div className="section wpost">
                <div className='row'>
                    <div className='col section-title'>
                        <h3>WindowPoSt due</h3>
                        <a data-tip data-for='wpost-desc'>(what is this?)</a>
                        <ReactTooltip id='wpost-desc' effect='solid' place='top'>
                            <span>List of 48 WindoPoSt submission deadlines ordered by due time (in epochs).<br/>Bars represent ~8TB disks to be proven, white are healthy disks, red are faulty.</span>
                        </ReactTooltip>
                    </div>
                </div>
                <WindowPoSt deadlines={miner.deadlines} head={head} />
            </div>
            <div id="provecommit" className="section">
                <div className='row'>
                    <div className='col section-title'>
                        <h3>ProveCommits due</h3>
                        <a data-tip data-for='provecommit-desc'>(what is this?)</a>
                        <ReactTooltip id='provecommit-desc' effect='solid' place='top'>
                            <span>List of ProveCommits ordered by due time (in epochs).<br/>Circles represent sectors to be proven.</span>
                        </ReactTooltip>
                    </div>
                </div>
                <div className="deadlines provecommit">
                    {
                    miner.preCommits && miner.preCommits.PreCommitDeadlines.map((d, i) =>
                    <div key={i} className='deadline'>
                        <div className="out">
                            In {d.Expiry - head.Height}
                            {/* <span className="epochs">epochs</span> */}
                        </div>
                        <div className="hddWrapper">
                            <div className='in'>
                                {Math.round(d.Sectors.length )} sectors
                            </div>
                            <div className="hdds">
                                {
                                d.Sectors.map(v =>
                                <div key={v} className={`hdd ${!!miner.sectors && !!miner.sectors.Sectors[v]}`}>{v === 215428 ? miner.sectors && miner.sectors.Sectors[v]  : ''}</div>
                                )
                                }
                            </div>
                        </div>
                    </div>
                    )
                    }

                </div>
            </div>
        </div>
    )
}

export default App
