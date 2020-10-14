import React, { useState, useEffect, useRef } from 'react'
import { withRouter } from 'react-router-dom'
import Chart from 'chart.js';

// number of consecutive block we take the average from 
const averageLength = 3
const blockLimit = 5* 10**9

function Gas({client,head}) {
    const [stats, setStat] = useState(new Stats(client, averageLength))

    const updateStats = async () => {
        const s = stats
        await s.fetchCids()
        setStat(s)
    }

    useEffect( () =>  {
        updateStats()
    },[client,head])

    return (
        <div className="row">
            <div className="accordion col-12" id="accordionExample">
                <MinerInfoCard nstats={stats} />
                <BiggestGasSpenderCard nstats={stats} head={head} />
                <GasTableCard nstats={stats} head={head} />
            </div>
        </div>
    )
}

function MinerInfoCard({nstats}) {
    const headers = ["Miner", 
        "Raw Byte Power",
        "Ratio over total raw power",
        "Size",
        "Daily gas required (wpost)",
        "Daily price FIL"
    ]

    const [minerAddr, setAddr] = useState('');
    const [data,setData] = useState({})

    const drawHeaders = (v) => v.map((h) => (<th key={h}> {h} </th>));
    const searchMiner = async () => {
        console.log("search miner for ",minerAddr)      
        const res = await  nstats.minerInfo(minerAddr)
        setData(res)
    }

    return (
    <div className="card">
        <div className="card-header" id="minerInfo">
            <h2>
            <button className="btn btn-link" type="button" data-toggle="collapse" data-target="#collapseInfo" aria-expanded="true" aria-controls="collapseInfo">
                Miner info search
            </button>
            </h2>
        </div>
        <div id="collapseInfo" className="collapse" aria-labelledby="minerInfo" data-parent="#accordionExample">
            <div className="card-body">
                <div className="row">
                    <div className="col-4"> </div>
                    <form>
                    <div className="form-group">
                        <label for="minerAddress">Miner address</label>
                        <input  value={minerAddr} 
                                onChange={e => setAddr(e.target.value)}
                                type="text" 
                                className="form-control" 
                                placeholder="Enter miner address" />
                    </div>
                    <button onClick={searchMiner} 
                            type="submit" 
                            className="btn btn-primary">
                        Search
                    </button>
                    </form>
                </div>
                <div className="row">
                    <div className="col-12">
                        <table className="table table-hover">
                            <thead>
                                <tr>
                                { drawHeaders(headers) }
                                </tr>
                            </thead>
                            <tbody>
                                 <tr> 
                                    <td> {minerAddr} </td>
                                    <td> {data.raw} </td>
                                    <td> {data.ratio} </td>
                                    <td> {data.size} </td>
                                    <td> {data.dailyGas} </td>
                                    <td> {data.maxDailyPrice} </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </div>
    )
}

function BiggestGasSpenderCard({head,nstats}) {
    const [dataset,setData] = useState({})
    const [opts,setOpts] = useState({})
    const [pie,setPie] = useState(undefined)
    const maxUser = 10
    const canvasRef = useRef(null)
    const cardRef = useRef(null)

    const setCollapseEvent = pie => {
        cardRef.current.addEventListener('show.bs.collapse', function () {
            pie.update();
        });
        cardRef.current.addEventListener('hide.bs.collapse', function () {
            pie.update();
        });
    }

    const fillDataset = async () => {
        const allHeights = await nstats.biggestGasUserFor() 
        if (Object.keys(allHeights).length < 1) {
            return
        }
        const sortedHeight = Object.keys(allHeights).sort((a,b) => b - a)
        const data = allHeights[sortedHeight[0]]
        const rawData = data.slice(0,maxUser).map((d) => d[1])
        const datasets= [
            {
                data: rawData,
                backgroundColor: objectMap(chartColors,(color,name) => color).slice(0,maxUser),
                label: "transaction gas",
            }
        ]
        const labels = data.slice(0,maxUser).map((d) => d[0])
        const newOpts = {
            title: {
                display: true,
                text: `Gas usage at height ${sortedHeight[0]}`,
            }
        }
        const newDataset = { 
            datasets: datasets,
            labels: labels,
        }
        setOpts(newOpts)
        setData(newDataset)

        var myPie = pie
        if (myPie == undefined) {
            const ctx = canvasRef.current.getContext('2d');
            const newPie = new Chart(ctx, {
                type: 'doughnut',
                data: newDataset,
                options: newOpts, 
            });
            myPie = newPie
            setCollapseEvent(myPie)
        } else {
            pie.data.datasets[0].data = rawData
            pie.options = newOpts
            pie.update()
        }
        setPie(myPie)
    }

    useEffect(() => { fillDataset() },[head,nstats])
    
    return (
    <div className="card">
        <div className="card-header" id="biggestGas">
            <h2>
            <button className="btn btn-link" type="button" data-toggle="collapse" data-target="#collapseBiggest" aria-expanded="true" aria-controls="collapseBiggest">
                Biggest gas users
            </button>
            </h2>
        </div>
        <div id="collapseBiggest" ref={cardRef} className="collapse" aria-labelledby="biggestGas" data-parent="#accordionExample">
            <div className="card-body">
                <div className="col-12">
                    { pie == undefined && <p> Loading.... </p> }
                    <canvas ref={canvasRef}>Loading...</canvas>
                </div>
            </div>
        </div>
    </div>
    )
}

function GasTableCard({nstats,head}) {
    const headers = ["", "Average Count", "Average GasUsed ", 
                    "Ratio over total GasUsed", 
                    "Average GasLimit",
                    "Ratio avg over total GasLimit",
                    "Ratio GasUsed over GasLimit",
                    "Ratio GasUsed over BlockLimit",
                    "Ratio GasLimit over BlockLimit",
                    ]
    const empty = Array(headers.length-1).fill(0)
    const [avgGas, setAvgGas] = useState({headers:headers,total:empty,wpost:empty,pre:empty,prove:empty})

    const updateAverage = async (nstats) =>  {
        const totalGasUsed = await nstats.avgTotalGasUsed()
        const totalGasLimit = await nstats.avgGasLimit()

        const computeEntry = async (...method) => {
            const nTx = await nstats.avgNumberTx(...method)
            const gasUsed = await nstats.avgGasOfMethod(...method)
            const gasLimit = await nstats.avgGasLimit(...method)
            const ratioUsed = await nstats.avgRatioUsedOverTotalUsed(...method)
            const ratioLimit = await nstats.avgRatioLimitOverTotalLimit(...method)
            const ratioUsedLimit = await nstats.avgRatioUsedOverLimit(...method)
            const ratioUsedBlockLimit = await nstats.avgTotalGasUsedOverTipsetLimit(...method)
            const ratioBlockLimit = await nstats.avgTotalGasLimitOverTipsetLimit(...method)
            return [
                nTx,
                gasUsed,
                ratioUsed,
                gasLimit,
                ratioLimit,
                ratioUsedLimit,
                ratioUsedBlockLimit,
                ratioBlockLimit, 
            ]    
        }
        const results = {}
        results.headers = headers
        results.total = await computeEntry()
        results.wpost = await computeEntry(5)
        results.pre = await computeEntry(6)
        results.prove = await computeEntry(7)
        setAvgGas(results)
    }

    useEffect( () => {
        updateAverage(nstats)
    },[nstats,head])

    const drawHeaders = (v) => v.map((h) => (<th key={h}> {h} </th>));

    return (
        <div className="card">
            <div className="card-header" id="headingOne">
                <h2>
                <button className="btn btn-link" type="button" data-toggle="collapse" data-target="#collapseOne" aria-expanded="false" aria-controls="collapseOne">
                    Gas usage table
                </button>
                </h2>
            </div>
            <div id="collapseOne" className="collapse" aria-labelledby="headingOne" data-parent="#accordionExample">
                <div className="card-body">
                    <div className="row">
                        <p> This table shows different statistics about the gas
        usage per epoch. All results are averaged accross the last
        {averageLength} epochs. You can find a complete description of each
        column below the table.  </p>
                        <div className="row">
                            <div className="col-12">
                                <table className="table table-hover">
                                    <thead>
                                        <tr>
                                            { drawHeaders(avgGas.headers) }
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <RowInfo name="Total gas used:" values={avgGas.total} />
                                        <RowInfo name="WindowPoSt:" values={avgGas.wpost} />
                                        <RowInfo name="PreCommit:" values={avgGas.pre} />
                                        <RowInfo name="ProveCommit:" values={avgGas.prove} />
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div className="row">
                            <div className="col-0"> </div>
                            <div className="col-11"> 
                                <ul className="list-group list-group-flush">
                                    <li className="list-group-item"><b>Average Count:</b> number of transaction per epoch in average of the method </li>
                                    <li className= "list-group-item"><b>Average GasUsed:</b> gas used per transaction of the method</li>
                                    <li className="list-group-item"><b>Ratio over total GasUsed:</b> Precedent number divided by the total gas used accross all epochs</li>
                                    <li className="list-group-item"><b>Average GasLimit:</b> gas limit set per transaction of the method</li>
                                    <li className="list-group-item"><b>Ratio over total GasLimit:</b> Precedent number divided by the total gas used accross all epochs</li>
                                    <li className="list-group-item"><b>Ratio GasUsed over GasLimit:</b> Total gas used for the method over total gas limit set accross all epoch</li>
                                    <li className="list-group-item"><b>Total GasUsed over BlockLimit:</b> Total gas used divided by total gas limit set per epoch</li>
                                    <li className="list-group-item"><b>Total GasLimit over BlockLimit:</b> precedent number divided by total gas limit set per epoch</li>
                                </ul> 
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

    )

}

// RowInfo is simply a row of the table filled by the main table 
function RowInfo(props) {
    const showValues = vv => vv.map((v,idx) => (
        <td key={idx.toString()}>
            {(isNaN(v) || Math.ceil(v) == v) ? v : v.toFixed(2) }
        </td>

    ));

    return (
        <tr> 
            <td> {props.name} </td>
            {showValues(props.values)} 
        </tr>
    )
}

export default withRouter(Gas)

class Stats {
    constructor(client, average) {
        this.fetcher = client
        this.average = average
        this.tipsets = {}
    }

    // XXX Make head a paramter and fethc only what it needs
    async fetchCids() {
        // at the moment take the first block - this is ok since parent tipset
        // is the same for all the blocks
        console.log("Initializing gas stats engine")
        const head = await this.fetcher.fetchHead()
        const height = head.Height
        this.tipsets[head.Height] = head 
        for (var i= 1; i < this.average; i++) {
            const tipset = await this.fetcher.fetchTipsetHead(height - i)
            this.tipsets[tipset.Height] = tipset
            console.log(i,"/",this.average,": init fetched tipset at height ", tipset.Height, " with [0] = ",tipset)
        }
        console.log("Stats: got " + Object.keys(this.tipsets).length + " tipset CIDs to make stats from")
    }

    // returns the average gas used of a given method
    async avgGasOfMethod(...method) {
        const msgs = await this.transactions(...method)
        const totalGas = msgs.reduce((total,v) => total + v[1].GasUsed,0)
        return totalGas / msgs.length
    }

    // Return the average of the gas limit PER height
    async avgGasLimit(...method) {
        return (await this.transactions(...method)).reduce((acc,tup) => acc + tup[0].Message.GasLimit,0)
    }

    async avgGasFeeCap(...method) {
        var avg = 0
        for (var height in this.tipsets) { 
            const tipset = this.tipsets[height]
            const msgs = await this.fetcher.parentAndReceiptsMessages(tipset.Cids[0],...method)
            avg += msgs.reduce((total,v) => total + parseInt(v[0].Message.GasFeeCap), 0) / msgs.length
        }
        return avg / Object.keys(this.tipsets).length
    }


    // Returns the average of the total gas used PER height
    async avgTotalGasUsed(...method) {
        const div = Object.keys(this.tipsets).length
        const reduc = (await this.transactions(...method)).reduce((total,tup) => total + tup[1].GasUsed, 0) 
        return reduc / div
    }

    async avgNumberTx(...method) {
        const tx = await this.transactions(...method)
        return tx.length / Object.keys(this.tipsets).length
    }

    async transactions(...method) {
        var allTx = []
        for (var height in this.tipsets) {
            const tipset = this.tipsets[height]
            const msgs = await this.fetcher.parentAndReceiptsMessages(tipset.Cids[0],...method)
            allTx = allTx.concat(msgs)
        }
        return allTx
    }

    async avgRatioUsedOverTotalUsed(...method) {
        const gasUsedMethod = (await this.transactions(...method)).reduce((acc,v) => acc + v[1].GasUsed,0)
        const totalUsed= (await this.transactions()).reduce((acc,v) => acc + v[1].GasUsed,0)
        return gasUsedMethod / totalUsed
    }

    async avgRatioLimitOverTotalLimit(...method) {
        const gasLimitMethod = (await this.transactions(...method)).reduce((acc,v) => acc + v[0].Message.GasLimit,0)
        const totalLimit = (await this.transactions()).reduce((acc,v) => acc + v[0].Message.GasLimit,0)
        return gasLimitMethod / totalLimit

    }

    // return the avg total gas limit set per height for the given method over
    // the maximal theoretical gas limit
    async avgTotalGasLimitOverTipsetLimit(...method) {
        var ratios = []
        for (var height in this.tipsets) {
            const tipset = this.tipsets[height]
            const msgs = await this.fetcher.parentAndReceiptsMessages(tipset.Cids[0],...method)
            const totalGasLimit = msgs.reduce((total,tup) => total + tup[0].Message.GasLimit,0)
            const nbBlocks = tipset.Cids.length
            const ratio = totalGasLimit / (blockLimit * nbBlocks)
            ratios.push(ratio)
        }
        // make the average
        return ratios.reduce((acc,v) => acc + v,0) / ratios.length
    }

    async avgTotalGasUsedOverTipsetLimit(...method) {
        var ratios = []
        for (var height in this.tipsets) {
            const tipset = this.tipsets[height]
            const msgs = await this.fetcher.parentAndReceiptsMessages(tipset.Cids[0],...method)
            const totalGasUsed = msgs.reduce((total,tup) => total + tup[1].GasUsed,0)
            const nbBlocks = tipset.Cids.length
            const ratio = totalGasUsed / (blockLimit * nbBlocks)
            ratios.push(ratio)
        }
        // make the average
        return ratios.reduce((acc,v) => acc + v,0) / ratios.length
    }


    async avgRatioUsedOverLimit(...method) {
        const used = (await this.transactions(...method)).reduce((acc,v) => acc + v[1].GasUsed,0)
        const limit = (await this.transactions(...method)).reduce((acc,v) => acc + v[0].Message.GasLimit,0)
        return used / limit

    }

    async biggestGasUserFor(...methods) {
        var datas = {}
        for (var height in this.tipsets) {
            const msgs = await this.transactions(...methods)
            var users = msgs.reduce((acc, tuple) => {
                if (acc[tuple[0].Message.To] == undefined) {
                    acc[tuple[0].Message.To] = 0
                }
                acc[tuple[0].Message.To] += tuple[1].GasUsed
                return acc
            },{})
            // combinatio of mapping over dict
            // https://stackoverflow.com/questions/14810506/map-function-for-objects-instead-of-arrays
            // and sorting in decreasing order
            // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort
            const sorted = objectMap(users, (gas,user) => [user,gas]).sort((a,b) => b[1] - a[1])
            datas[height] = sorted
            console.log("Biggest txs at height",height," -> ",sorted.slice(0,10))
        }
        return datas
    }

    sortedHeights() {
        return Object.keys(this.tipsets).sort((a,b) => b - a)
    }

    async minerInfo(miner) {
        const allHeights = this.sortedHeights()
        const tipset = this.tipsets[allHeights[0]]
        const mif = await this.fetcher.getMinerPower(tipset.Cids,tipset.Height,miner)
        const gas = await this.avgGasOfMethod(5)         
        const nbSectors = sizeToSectors(mif.MinerPower.RawBytePower)
        const size = sizeToString(mif.MinerPower.RawBytePower)
        const dailyGas = sectorsToPost(nbSectors) * gas
        const maxDailyPrice = dailyGas * (await this.avgGasFeeCap(5))
        return {
            raw: mif.MinerPower.RawBytePower,
            ratio: (mif.MinerPower.RawBytePower / mif.TotalPower.RawBytePower).toFixed(3),
            size: size,
            dailyGas: dailyGas.toFixed(2),
            maxDailyPrice: attoToFIL(maxDailyPrice).toFixed(2),
        }
    }
}

export function objectMap(obj, fn) {
    return Object.entries(obj).map(
      ([k, v], i) => fn(v, k, i)
    )
}

const chartColors = {
	red: 'rgb(255, 99, 132)',
	orange: 'rgb(255, 159, 64)',
	yellow: 'rgb(255, 205, 86)',
	green: 'rgb(75, 192, 192)',
	blue: 'rgb(54, 162, 235)',
	purple: 'rgb(153, 102, 255)',
	grey: 'rgb(201, 203, 207)'
};

const roundsPerDay = 2 * 60 * 24
const roundsInDeadline = 2 * 30 
const deadlines = 48
const maxSectorsPerPost = 2349
function wpostToSectors(wpost) { return maxSectorsPerPost * wpost }
function sectorsToPost(sectors) { return sectors / maxSectorsPerPost }
function gbToPB(v) { return v/1024/1024 }
function pbToGB(v) { return v*1024*1024}
// Returns the estimated growthRate per day assuming this number of prove
// commits at one height (or an average etc)
function growthRate(prove) { return gbToPB(prove * 32) * roundsPerDay }
function roundsInDays(rounds) { return Math.ceil(rounds / 2 / 60 / 24) }

function sizeToString(s) {
    var biUnits = ["B", "KiB", "MiB", "GiB", "TiB", "PiB", "EiB"]
	var unit = 0
	while (s >= 1024 && unit < biUnits.length-1) {
		s /= 1024
		unit++
	}
    s = s.toFixed(2)
	return `${s} ${biUnits[unit]}`
}

function sizeToSectors(s) {
    return s/1024/1024/1024/32
}

function attoToFIL(atto) {
    return atto * 10**-18
}
