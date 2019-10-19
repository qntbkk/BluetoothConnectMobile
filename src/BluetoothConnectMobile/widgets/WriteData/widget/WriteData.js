define([
    "dojo/_base/declare",
    "mxui/widget/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dojo/dom-class",
    "dojo/_base/lang",
    "dojo/query",
    "dojo/on",
    "dojo/date/locale",
    "dojo/text!BluetoothConnectMobile/widgets/WriteData/widget/template/WriteData.html"
], function (declare, _WidgetBase, _TemplatedMixin, dojoClass, dojoLang, dojoQuery, on, locale, widgetTemplate) {
    "use strict";

    return declare("BluetoothConnectMobile.widgets.WriteData.widget.WriteData", [ _WidgetBase, _TemplatedMixin ], {

        templateString: widgetTemplate,
        // Dom elememnts
        theButton: null,

        // Internal variables.
        _handles: null,
        _contextObj: null,
        bluetoothEntity: "",
        serialDataEntity: "",
        refreshContext: "",
        pid: "",

        constructor: function () {
            this._handles = [];
            bluetoothSerial.enable();
            this.connectDevice = this.connectDevice.bind(this);
            this.connectSuccessHandler = this.connectSuccessHandler.bind(this);
            this.connectFailHandler = this.connectFailHandler.bind(this);
            this.readData = this.readData.bind(this);
            this.refreshContextObject = this.refreshContextObject.bind(this);
        },

        postCreate: function () {
            logger.debug(this.id + ".postCreate");
            this.theButton.innerHTML = "Write Data" ;
            on(this.theButton, "click", dojoLang.hitch(this, this.connectDevice));
        },

        update: function (obj, callback) {
            logger.debug(this.id + ".update");

            this._contextObj = obj;
            this._updateRendering(callback);
        },

        resize: function (box) {
            logger.debug(this.id + ".resize");
        },

        uninitialize: function () {
            logger.debug(this.id + ".uninitialize");
        },

        

        _updateRendering: function(callback) {
            if (this._contextObj !== null) {
            } else {
            }
            bluetoothSerial.disconnect();
            // The callback, coming from update, needs to be executed, to let the page know it finished rendering
            this._executeCallback(callback, "_updateRendering");
        },
        _executeCallback: function(cb, from) {
            if (cb && typeof cb === "function") {
                cb();
            }
        },


        /*
            This function will - based on either UUID or MAC address try to establish a connection with a
            bluetooth device. If this is successful, the sucesshandler is called to trigger the serial data buffer
        */
        connectDevice: function(){

            var self = this;

            self.pid = mx.ui.showProgress("connecting to the device ...", true);
            var address = self._contextObj.get("address");
            var uuid = self._contextObj.get("UUID");
            var paired = self._contextObj.get("Paired");
            var connectionId = address !== "" ? address : (uuid !== "" ? uuid : "");

            function lazyLoad() {
                if(connectionId && connectionId !== ""){
                    return new Promise(resolve => {
                        setTimeout(() => {
                            resolve(
                                bluetoothSerial.enable(),
                                bluetoothSerial.subscribe('\n', function(data) {
                                    alert(data);
                                    }, function(error){
                                    console.log("could not create data: " + error);
                                    }   
                                ),
                                bluetoothSerial.connect(connectionId, self.connectSuccessHandler, self.connectFailHandler)
                            );
                        },3000)
                    })
                }else {
                    mx.ui.info("Connection id: " + connectionId);
                    mx.ui.hideProgress(self.pid);
                    bluetoothSerial.disconnect();
                }
            };

            async function lazyConnect() {
                await lazyLoad();
            };

            lazyConnect();
            
        },
        /*
            This function is called if a succesful connection is established between the client device and selected bluetooth
            device. It will trigger the readData function in order to write all data from the buffer to the MBS
        */
        connectSuccessHandler: function(){
            var self = this;
            
            self._contextObj.set("Paired", true);
            mx.ui.info("Connect Success: " + self._contextObj.get("name"));
            mx.ui.hideProgress(self.pid);

            function lazyLoad() {
                return new Promise(resolve => {
                    setTimeout(() => {
                        resolve(
                            self.writeData()
                        );
                    }, 5000)
                })
            };

            async function lazyRead() {
                await lazyLoad();
            };

            lazyRead();
        },
        /*
            This function is called if the application was not able to establish a connection between the client device and the selected
            bluetooth device.
        */
        connectFailHandler: function(error){
            this._contextObj.set("Paired", false);
            mx.ui.warning("Failed at connect handler: " + error, true);            
            mx.ui.hideProgress(this.pid);
            bluetoothSerial.disconnect();
        },
        /*
            This function uses the read method from the bluetoothSerial library to read the data buffer of a bluetooth device
            this data is stored in a newly created Mendix object and refreshes the context object through the refreshContextObject
            method.
        */

        writeData: function(){
            var self = this;

            var CHAR_ESC = 0x1b; 
            var LINE_FEED = '\n'; 
            var CARRIAGE_RETURN = '\r';

            const string = "โดยจากผลโหวตล่าสุดของสื่อ";
            const encoder = new TextEncoder();
            const utf8 = new Uint8Array(string.length);

            var b1 = encoder.encode(string);

            /* var data = "! 0 200 200 80 1" + CARRIAGE_RETURN + LINE_FEED +
            "IN-MILLIMETERS" + CARRIAGE_RETURN + LINE_FEED +
            "JOURNAL" + CARRIAGE_RETURN + LINE_FEED +
            "CENTER" + CARRIAGE_RETURN + LINE_FEED +
            "COUNTRY CP874" + CARRIAGE_RETURN + LINE_FEED +
            b1 + CARRIAGE_RETURN + LINE_FEED +
            "PRINT" + CARRIAGE_RETURN + LINE_FEED; */

            /* var data = new Uint8Array(8);
            data[0] = 0x41;
            data[1] = 0x42;
            data[2] = 0x43;
            data[3] = 0x44;
            data[4] = 0xA1;
            data[5] = 0xA2;
            data[6] = 0xA3;
            data[7] = 0x10; */

            /* var data = new Uint8Array(4);
            data[0] = 0E01;
            data[1] = 0E01;
            data[2] = 0E01;
            data[3] = 0E01; */
            
            var context = [186, 220, 222];

            var data = "TEXT T_TAHO12 0 20 0 ;;ทดสอบบบบ;;" + CARRIAGE_RETURN + LINE_FEED+ "PRINT" + CARRIAGE_RETURN + LINE_FEED;
            

            /* var context = new Uint8Array(4);
            context[0] = 0x0041;
            context[1] = 0x0041;
            context[2] = 0x0041;
            context[3] = 0x0041; */

            /* var data = "! UTILITIES" + CARRIAGE_RETURN + LINE_FEED +
            "COUNTRY CP874" + CARRIAGE_RETURN + LINE_FEED +
            "PRINT" + CARRIAGE_RETURN + LINE_FEED +
            context + CARRIAGE_RETURN + LINE_FEED; */

            /* var data = "! 0 200 200 200 1" + CARRIAGE_RETURN + LINE_FEED +
            //"COUNTRY THAI" + CARRIAGE_RETURN + LINE_FEED +
            "PRINT" + CARRIAGE_RETURN + LINE_FEED +
            "TEXT Thailand" + CARRIAGE_RETURN + LINE_FEED +
            "origin: ค" + CARRIAGE_RETURN + LINE_FEED +
            "dec: 3588" + CARRIAGE_RETURN + LINE_FEED +
            "hex: 0E04" + CARRIAGE_RETURN + LINE_FEED +
            "U+: U+0E04" + CARRIAGE_RETURN + LINE_FEED +
            "UTF8: E0 B8 84" + CARRIAGE_RETURN + LINE_FEED +
            "UTF16BE: 0E 04" + CARRIAGE_RETURN + LINE_FEED +
            "UTF16LE: 04 0E" + CARRIAGE_RETURN + LINE_FEED; */

            /* var data = "! 0 200 200 200 1\r\n"
            +"ON-FEED IGNORE\r\n"
            +"JOURNAL\r\n"
            // +"COUNTRY CP874\r\n"
            +"TEXT "+ "ANG12PT.CPF" +" 0 95 80 0E04  \r\n"
            +"LEFT\r\nTEXT "+ "ANG12PT.CPF" +" 0 95 110 วันที่ :00/00/0000  \r\n"
            + "PRINT\r\n"; */

            /* var data = "! 0 200 200 200 1" + CARRIAGE_RETURN + LINE_FEED +
            "ENCODING GB18030" + CARRIAGE_RETURN + LINE_FEED +
            "TEXT GBUNSG24.CPF 0 20 30 Font: GBUNSG24 ‚t‚u" + CARRIAGE_RETURN + LINE_FEED +
            "ENCODING ASCII" + CARRIAGE_RETURN + LINE_FEED +
            "TEXT 7 0 20 80 Font 7, Size 0" + CARRIAGE_RETURN + LINE_FEED +
            "PRINT" + CARRIAGE_RETURN + LINE_FEED ; */

            bluetoothSerial.write(data,
                function(){
                    alert('ok');
                },
                function(){
                    alert('Error!');
                });
        },

        readData: function(){
            var self = this;
            bluetoothSerial.read(function(data){
                console.log("got data from device: " + data);
                if(data === ""){
                    mx.ui.info("Data is empty, need to connect again");
                    bluetoothSerial.disconnect();
                } else {
                    return new Promise((resolve, reject) => {
                        mx.data.create({
                            entity: self.serialDataEntity,
                            callback: function(obj){
                                obj.set("Data", data);
                                obj.addReference("MyFirstModule.SerialData_BluetoothDevice", self._contextObj.getGuid());
                                
                                mx.data.commit({
                                    mxobj    : obj,
                                    callback : function() {
                                        console.log("Object committed");
                                    },
                                    error : function(err) {
                                        console.log("Error occurred attempting to commit " + err);
                                    }
                                });
                                resolve(obj);
                                self.refreshContextObject();
                                bluetoothSerial.disconnect();
                            },
                            error: function(error){
                                console.log("could not create data: " + error);
                                reject(error);
                                bluetoothSerial.disconnect();
                            }
                        });
                    });
                    
                }
            }, this.connectFailHandler);
        },

        /*
            This function triggers a microflow in the MBS to refresh the context object in order
            to reflect all the UI changes.
        */
        refreshContextObject: function(){
            var self = this;
            return new Promise((resolve, reject) => {
                mx.data.action({
                    params: {
                        actionname: self.refreshContext,
                        applyto: "selection",
                        guids: [self._contextObj.getGuid()]
                    },
                    callback: function(){
                        console.log("refreshed context");
                        resolve();
                    },
                    error: function(error){
                        console.log("could not refresh microflow: " + error);
                        reject(error);
                        bluetoothSerial.disconnect();
                    }
                })
            });
            
        }
    });
});

require(["BluetoothConnectMobile/widgets/WriteData/widget/WriteData"]);
