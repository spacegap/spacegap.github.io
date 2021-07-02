import * as React from 'react';
import {useContext, useEffect, useState} from "react";
import {getHomepage} from "../api";

export const DatastoreContext = React.createContext();

export function DatastoreProvider(props) {
  const [data, setData] = useState({})
  const [error, setError] = useState()

  useEffect(() => {
    getHomepage(data => {
      setData(prevData => ({
        ...prevData,
        ...data,
      }))
    }, error => {
      setError(error)
    })
  }, [])

  return (
    <DatastoreContext.Provider value={{data}}>
      {props.children}
    </DatastoreContext.Provider>
  )
}
