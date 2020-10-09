import React, { useState, useEffect } from 'react'
import { withRouter } from 'react-router-dom'

// number of consecutive block we take the average from 
const averageLength = 1
const blockLimit = 5* 10**9

function Gas({client,head}) {
    const headers = ["", "Average Count", "Average GasUsed ", 
                    "Ratio over total GasUsed", 
                    "Average GasLimit",
                    "Ratio over total GasLimit",
                    "GasLimit over BlockLimit"]
    const empty = Array(headers.length-1).fill(0)
    const [avgGas, setAvgGas] = useState({headers:headers,total:empty,wpost:empty,pre:empty,prove:empty})
    const [stats, setStat] = useState(undefined)

    const initStats = async () => {
        const newStats = new Stats(client, averageLength, head)
        await newStats.fetchCids()
        setStat(newStats)
        return newStats
    }

    
    const updateAverage = async () =>  {
        const nstats = await initStats()
        const totalGasUsed = await nstats.avgTotalGasUsed()
        const totalGasLimit = await nstats.avgGasLimit()

        const computeEntry = async (...method) => {
            const nTx = await nstats.avgNumberTx(...method)
            const gasUsed = await nstats.avgGasOfMethod(...method)
            const gasLimit = await nstats.avgGasLimit(...method)
            const ratioUsed = await nstats.avgRatioUsedOverTotalUsed(...method)
            const ratioLimit = await nstats.avgRatioLimitOverTotalLimit(...method)
            const ratioBlockLimit = await nstats.avgTotalGasLimitOverTipsetLimit(...method)
            return [
                nTx,
                gasUsed,
                ratioUsed,
                gasLimit,
                ratioLimit,
                ratioBlockLimit, 
            ]    
        }

        const results = {}
        results.headers = headers
        results.total = await computeEntry()
        results.wpost = await computeEntry(5)
        results.pre = await computeEntry(6)
        results.prove = await computeEntry(7)
        console.log("RESULTS: ",results)
        setAvgGas(results)
    }

    useEffect( () => {
        updateAverage()
    },[head])

    const drawHeaders = (v) => v.map((h) => (<th key={h}> {h} </th>));

    return (
        <div className="row">
            <p> This table shows different statistics about the gas usage per epoch. All results are averaged
                accross the last {averageLength} epochs. You can find a complete description of each column 
                below the table.
            </p>
            <div className="row">
                <div className="col-12">
                    <table className="table table-hover">
                        <thead>
                            <tr>
                                { drawHeaders(avgGas.headers) }
                            </tr>
                        </thead>
                        <tbody>
                            <GasIndicator name="Total gas used:" values={avgGas.total} />
                            <GasIndicator name="WindowPoSt:" values={avgGas.wpost} />
                            <GasIndicator name="PreCommit:" values={avgGas.pre} />
                            <GasIndicator name="ProveCommit:" values={avgGas.prove} />
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
                        <li className="list-group-item"><b>Total GasLimit over BlockLimit:</b> precedent number divided by total gas limit set per epoch</li>
                    </ul> 
                </div>
            </div>
        </div>
    )
}

function GasIndicator(props) {
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

//const value = (v) => isNaN(v) ? : "loading..." : v

export default withRouter(Gas)

class Stats {
    constructor(client, average,head) {
        this.fetcher = client
        this.average = average
        this.head = head
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
        console.log("Stats: got " + this.tipsets.length + " tipset CIDs to make stats from")
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
            ratios = ratios.concat(ratio)
        }
        // make the average
        return ratios.reduce((acc,v) => acc + v,0) / ratios.length
    }

}
