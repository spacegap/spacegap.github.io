import React from 'react'

import s from './s.module.css'

export function About() {
  return (
    <section className={s.sectionContainer}>
      <h1 className={s.header}>Methodology</h1>
      <p>Monitoring and analytics tools are important components of any network whether we are talking about audit processes, debugging processes or simple monitoring platforms. The Spacegap web application is one of the most comprehensive applications that serves the Filecoin blockchain. Based on on-chain data, but also aggregating data from other providers, it is able to provide information about the network status, tokens, network economy, gas usage analysis, as well as customised statistics for each miner about tokens, sectors, WindowPoSt and others. Each section of the application is described below</p>
      <h2 className={s.secondaryHeader}>Tokens</h2>
      <p>This section provides data on the supply of tokens and a breakdown of their status. The data is obtained by querying the CirculatingSupply method of the Lotus state method group at different TipSets in order to get realtime and 24h old values. Based on this we disply:
        <ul>
          <li>circulating supply</li>
          <li>the amount of burned tokens</li>
          <li>the amount of locked tokens</li>
          <li>new supply of tokens in the last 24h</li>
          <li>new supply of tokens burnt in the last 24h</li>
          <li>new amount of tokens locked in the last 24h</li>
        </ul>
      </p>
      <h2 className={s.secondaryHeader}>Power</h2>
      <p>This section provides data obtained by reading the state of the Power Actor available at f04 address. Based on this we display:
        <ul>
          <li>the total raw power of the network</li>
          <li>the amount of bytes committed in the last 24 hours</li>
          <li>the number of miners whose power is above a certain threshold being thus considered active</li>
        </ul>
      </p>
      <h2 className={s.secondaryHeader}>Gas</h2>
      <p>
        This section provides analytics data about the network gas usage.
        In order to have an overview over the growth of the network we scrape the transactions and filter the proving and commiting messages, process them and plot the result on a graph.
        By processing the latest on-chain messages we rank miners by the amount of gas spend and the result is a pie chart showing the biggest gas spenders in the latest block.
        <br /><br />The Gas Usage table shows averaged gas usage data across the last 3 epochs. The Spacegap scraper parses the messages in order to get statistics about gas metrics such as Gas Used per transaction or Gas Limit per transaction. Based on the total number of transactions and the total number of blocks, we can apply math formulas to compute various metrics like:
        <ul>
          <li>Average Count - number of transaction per epoch in average of the method</li>
          <li>Average GasUsed - gas used per transaction of the method</li>
          <li>Ratio over total GasUsed - Precedent number divided by the total gas used in avg per epoch</li>
          <li>Average GasLimit - gas limit set per transaction of the method</li>
          <li>Ratio over total GasLimit - Precedent number divided by the total gas limit in avg per epoch</li>
          <li>Ratio GasUsed over GasLimit - Total gas used for the method over total gas limit in avg per epoch</li>
          <li>Total GasUsed over BlockLimit - Total gas used divided by total gas limit set per epoch computed with number of blocks</li>
          <li>Total GasLimit over BlockLimit - Total gas limit divided by total gas limit set per epoch computed with number of blocks per epoch</li>
        </ul>
      </p>
      <h2 className={s.secondaryHeader}>Economics</h2>
      <p>
        This section provides valuable information about the economic aspect of the network. it uses the state of the network and other actors to build the data set needed for projections. The algorithm starts with collecting data from the state of the network, from the state of the Power actor (f04) and from the state of the Reward actor (f02). This data is used to calculate the projections for future rewards and the initial pledge according to the Quality Adj Power of the network. The projections are calculated using alpha beta filters that generate approximations based on a model whose states are obtained by mathematical integrations.
        <br /><br />
        In the end, these data fields are generated:
        <ul>
          <li>Sector Pledge - the amount of pledge per sector in FILs</li>
          <li>Sector 360 Days Reward - approximate annual reward in FILs</li>
          <li>Sector Fault Fee - the approximate penalty for sector faults</li>
          <li>Block Reward - rewards for each block in FILs</li>
          <li>1-Day FIL / TiB Reward - reward expressed per day and per terrabyte</li>
        </ul>
      </p>
      <h2 className={s.secondaryHeader}>Top Miners</h2>
      <p>
        This section provides a broader picture of miners by aggregating data from multiple providers and thus characterizing miners from several points of view.
        <br /><br />
        Data sources used:
        <ul>
          <li>Filrep.io - provides the list of miners sorted by reputation score together with the raw power associated with each</li>
          <li>Lotus getActor method - provides information about miners precommits</li>
          <li>Lotus readState method - provides information about the token balance of each miner</li>
        </ul>
      </p>
    </section>
  )
}
