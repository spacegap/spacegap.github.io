import React, { useState, useEffect } from 'react'
import ReactTooltip from 'react-tooltip';
import {
    HashRouter as Router,
    Switch,
    Route,
    Link,
    useRouteMatch,
    useParams
} from "react-router-dom";
import {
    fetchHead,
    fetchSectors,
    fetchDeadlines,
    fetchPreCommittedSectors,
    fetchDeposits,
    getMiners
} from './services/filecoin'
import Blockies from 'blockies-identicon'
import 'bootstrap/dist/css/bootstrap.min.css'
import './App.scss'

const d3 = require('d3')
const f = d3.format(',')

function getJSONFromHistory (name) {
    const prev = window.localStorage.getItem(name)
    return prev && JSON.parse(prev)
}

function App () {

    return (
        <Router>
            <div className='App'>
                <header className='container-fluid'>
                    <Link to="/">
                        <h1 id="logo" className='logo'><span>spacegap</span></h1>
                    </Link>
                </header>
                <Switch>
                    <Route path='/miners/:minerId'>
                        <section className='container'>
                            <Miner />
                        </section>
                    </Route>
                    <Route path='/'>
                        <Home />
                    </Route>
                </Switch>
            </div>
        </Router>
    )
}

function Home () {
    const [miners, setMiners] = useState()

    useEffect(() => {
        getMiners().then(res => {
            setMiners(res)
        })
    }, [])

    return (
        <section id='LookUp' className='container'>
            Dashboard for Proof-of-Space mining

            {miners && Object.keys(miners).slice(0, 50).map(d =>
                <div>
                    <Link to={`/miners/${miners[d].address}`}>{miners[d].address}</Link>
                </div>
            )}
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

const Miner = () => {
    let { minerId } = useParams();

    const [head, setHead] = useState()
    const [miners, setMiners] = useState()

    useEffect(() => {
        getMiners().then(res => {
            setMiners(res)
        })
    }, [])

    // Fetch head
    useEffect(() => {
        const fetchingHead = async () => {
            const fetched = await fetchHead()
            setHead(fetched)
        }
        fetchingHead()
        setInterval(() => fetchingHead(), 30000)
    }, [])

    const canvasRef = React.useRef(null)
    const [context, setContext] = React.useState(null)

    const [miner, setMiner] = useState({id: minerId})

    // On new (hash or head): fetch miner
    useEffect(() => {
        if (!minerId || !head) return;

        let mounted = true
        setMiner({...miner})

        fetchDeadlines(minerId, head).then(deadlines => {
            if (mounted) {
                miner.deadlines = deadlines
                setMiner({...miner})
                /* window.localStorage.setItem(`miner_{minerId}`, JSON.stringify(miner)) */
            }
        })

        fetchDeposits(minerId, head).then(deposits => {
            if (mounted) {
                miner.deposits = deposits
                setMiner({...miner})
                /* window.localStorage.setItem('miner', JSON.stringify(miner)) */
            }
        })

        fetchPreCommittedSectors(minerId, head).then(preCommits => {
            if (mounted) {
                miner.preCommits = preCommits
                setMiner({...miner})
                /* window.localStorage.setItem('miner', JSON.stringify(miner)) */
            }
        })

        fetchSectors(minerId, head).then(sectors => {
            if (mounted) {
                miner.sectors = sectors
                setMiner({...miner})
                /* window.localStorage.setItem('miner', JSON.stringify(miner)) */
            }
        })

        return () => { mounted = false }
    }, [head, minerId])

    useEffect(() => {
        if (canvasRef.current) {
            Blockies.render({seed: miner.id}, canvasRef.current)

            const renderCtx = canvasRef.current.getContext('2d');

            if (renderCtx) {
                setContext(renderCtx);
            }
        }
    }, [context, miner]);

    if (!miner) {
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

            <div id="wpost" className="section">
                <div className='row'>
                    <div className='col section-title'>
                        <h3>WindowPoSt due</h3>
                        <a data-tip data-for='wpost-desc'>(what is this?)</a>
                        <ReactTooltip id='wpost-desc' effect='solid' place='top'>
                            <span>List of 48 WindoPoSt submission deadlines ordered by due time (in epochs).<br/>Bars represent ~8TB disks to be proven, white are healthy disks, red are faulty.</span>
                        </ReactTooltip>
                    </div>
                </div>
                <div className="deadlines windowpost">
                    {
                        miner.deadlines && miner.deadlines.nextDeadlines.map(d =>
                            <div className={d.TotalSectors === 0 ? 'deadline opacity5' : 'deadline'}>

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
                                                ))].map(v => <div className='hdd'></div>)
                                        }
                                        {
                                            [...Array(Math.ceil(Math.round(+d.FaultyPower.Raw/(1024*1024*1024*1024))/8))].map(v =>
                                                <div className='hdd faulty'></div>
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
                        miner.preCommits && miner.preCommits.PreCommitDeadlines.map(d =>
                            <div className='deadline'>
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
                                                <div id={v} className={`hdd ${!!miner.sectors && !!miner.sectors.Sectors[v]}`}>{v == 215428 ? miner.sectors && miner.sectors.Sectors[v]  : ''}</div>
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
            </div>
        </div>
    )
}

export default App
