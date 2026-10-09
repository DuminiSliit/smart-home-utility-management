import { Button, StyleSheet, Text, View,ActivityIndicator} from 'react-native';
import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';

export default function CurrentStatus() {
    const [currentUsage, setCurrentUsage] = useState([]);
    const [DailyAverage, setDailyAverage] = useState([]);
    const [Status, setStatus] = useState([]);

    const [loading, setLoading] = useState(true);
    let socket : any;

    const Socket_url = "http://192.168.56.2:5000"


    let receivedData : any
    useEffect(() => {
        try{
            socket = io(Socket_url,{
                transports : ['websocket']

            })

            console.log("initializing socket", socket)
            socket.on('connect', ()=>{
                console.log("==Socket Connected!")
            })

           socket.on('disconnect', ()=>{
                console.log("==Socket Disconnected!")
            })

            socket.on('error', ()=>{
                console.log("Socket Error!")
            })
    
    // Listen for the initial_data event and update the state with the received data
    //Following data will only recieve once and then will not update 
    
    socket.on('initial_data', (receivedData) => {
        console.log("Received initial data: ", receivedData);
        setDailyAverage(receivedData.dailyAverage);
        setStatus(receivedData.status)
        setLoading(false);
    });
/*
    socket.on('initial_data_sensor', (receivedData) => {
        console.log("Received initial data: ", receivedData);
        setData(receivedData.data); 
        setLoading(false);
    });

*/

         // Listen for continuous updates and update the state
         socket.on('update_data', (receivedData) => {
            console.log("Received update data: ", receivedData);
           // setData(prevData => [...prevData, receivedData]);  // Append new data to state

            setCurrentUsage(receivedData.currentUsage);
            console.log(receivedData.currentUsage);
        });




        }catch(error){
            console.log("socket is not initialized", error)
        }
    }, []);

    if (loading) {
        return     <ActivityIndicator size="large" color="#00ff00"/>
        ;
    }



    
    const firstItem = currentUsage.length > 0 ? currentUsage[0]["title"] : "No data";

    return (
        <View style={styles.container}>
            <Text>{firstItem}</Text>

            <View style={styles.mainView}>
                <View style={styles.viewCard}>
                    <Text>Current Usage</Text>
                    <Text>{JSON.stringify(currentUsage)}</Text> 
                </View>
                <View style={styles.viewCard}>
                    <Text>Daily Average</Text>
                    <Text>{JSON.stringify(DailyAverage)}</Text>
                </View>
                <View style={styles.viewCard}>
                    <Text>Status</Text>
                    <Text>{JSON.stringify(Status)}</Text>
                </View>
            </View>

            <Button title="Click me" onPress={() => {/* Handle button press */}} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
      },
      horizontal: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        padding: 10,
      },
    mainView: {
        flex: 1,
        flexDirection: 'row',
        padding: 8
    },
    viewCard: {
        flex: 1,
        width: 100,
        height: 100,
        borderRadius: 4,
        margin: 8,
        alignItems: 'center',
        justifyContent: 'center'
    }
});