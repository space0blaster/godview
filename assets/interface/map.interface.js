let historyData=[];
let navShowing=false;
let myLocation=false;
let defaultModel="anthropic";
let modelOptions=[
    {value:'anthropic',provider:'Anthropic',model:'sonnet-3.5',text:'Sonnet 3.5'},
    {value:'deepseek',provider:'DeepSeed',model:'deepseek-v3',text:'DeepSeek v3'},
    {value:'openai',provider:'Open AI',model:'gpt-4o',text:'GPT-4o'},
    {value:'local',provider:'Local',model:'Local',text:'Local'},
];
let selectedModel=modelOptions[0];
//

var discoverHistoryData=[];
var lat,long,map;
var cursorEnabled=true;
var popups=[];
class MapInterface extends I {
    static map() {
        I.menu();

        // map
        let mapBox=E.div(body,'','mapBox');

        // prompt
        let promptBox=E.div(body,'','prompt');
        let promptTable=E.table(promptBox,'','','center','100%');
        let tr1=E.tableR(promptTable);
        let field=E.input(E.tableC(tr1,'90%'),'text','','promptField','Eg: "show me 5 soccer fields in NYC"');
        E.tableC(tr1,'10%');
        //
        let tr2=E.tableR(promptTable);
        let optBox=E.div(E.tableC(tr2,'90%'),'promptOptionsBox','');
        let locate=E.div(optBox,'promptOptions','locate');
        locate.innerHTML='<span class="promptOptIcon"><i class="fa-solid fa-location-arrow"></i></span> <span class="promptOptText">Locate Me</span>';
        locate.title='Locate me.';
        let model=E.div(optBox,'promptOptions','model');
        model.innerHTML='<span class="promptOptIcon"><i class="fa-solid fa-brain-circuit"></i></span> <span class="promptOptText">'+selectedModel.text+'</span>';
        model.title='Select model.';
        model.onclick=()=>{
            if(modelOptions.findIndex(x=>x.value===selectedModel.value)<modelOptions.length-1) selectedModel=modelOptions[modelOptions.findIndex(x=>x.value===selectedModel.value)+1];
            else selectedModel=modelOptions[0];
            model.innerHTML='<span class="promptOptIcon"><i class="fa-solid fa-brain-circuit"></i></span> <span class="promptOptText">'+selectedModel.text+'</span>';
        };
        //
        let buttonBox=E.tableC(tr2,'10%');
        let button=E.button(buttonBox,'','promptButton','<i class="fa-solid fa-arrow-up"></i>');
        let loading=E.img(buttonBox,'','promptLoad',rootURL+'/loading2.gif');
        //
        promptBox.style.top=window.innerHeight-215+'px';
        //

        // history
        let history=E.div(body,'','history');
        E.div(history,'','historyTitle').innerHTML='History';
        E.table(history,'','historyTable','center','90%');

        //
        E.div(body,'','cards');

        let map=new maplibregl.Map({
            container:'mapBox',
            //style:styleData.mapStyle,
            style:'http://localhost:3939/godview_light.json',
            center:[-73.9856,40.7128],
            zoom:10
        });

        locate.onclick=()=>{
            if("geolocation" in navigator) {
                if(!myLocation || !myLocation.latitude || !myLocation.longitude) {
                    navigator.geolocation.getCurrentPosition((position)=>{
                        new maplibregl.Marker({color: '#'+(Math.random() * 0xFFFFFF << 0).toString(16).padStart(6, '0')})
                            .setLngLat([position.coords.longitude,position.coords.latitude])
                            .setPopup(new mapboxgl.Popup().setHTML('<div class="pointName">My Location</div><div class="pointAddress"></div><div class="pointLatLong">Lat,Long: '+position.coords.latitude.toFixed(2)+', '+position.coords.longitude.toFixed(2)+'</div>'))
                            .addTo(map);
                        map.panTo([position.coords.longitude,position.coords.latitude]);
                        myLocation={latitude:position.coords.latitude,longitude:position.coords.longitude};
                    });
                }
                else map.panTo([myLocation.longitude,myLocation.latitude]);
            }
        };

        field.onkeydown=(e)=>{
            if(e.keyCode===13) prompt();
        };
        button.onclick=()=>{
            prompt();
        };
        function prompt() {
            button.style.display='none';
            loading.style.display='block';
            A.r('POST','/query',{prompt:field.value,myLocation:myLocation,model:selectedModel.value},(error,data)=>{
                loading.style.display='none';
                button.style.display='block';
                history.style.visibility='visible';
                if(!error) {
                    //
                    let hex='#'+(Math.random() * 0xFFFFFF << 0).toString(16).padStart(6, '0');
                    MapInterface.history(map,field.value,hex);
                    historyData.push({hex:hex,markers:[],data:[]});
                    //
                    if(!navShowing && window.innerWidth>500) {
                        let nav=new maplibregl.NavigationControl({
                            showZoom:true,
                            showCompass:true,
                            visualizePitch:true
                        });
                        map.addControl(nav,'bottom-left');
                        navShowing=true;
                    }
                    //
                    field.value='';
                    if(data && data.length>0) {
                        //map.setZoom(7);
                        E.get('cards').innerHTML='';
                        data.forEach((dataItem,i)=>{
                            MapInterface.point(map,dataItem,hex);
                            MapInterface.card(map,dataItem,hex,i);
                            if(i===data.length-1) {
                                map.panTo([dataItem.longitude,dataItem.latitude]);
                            }
                        });
                    }
                }
                else I.error(error);
            });
        }

        //

    };

    static point(map,pointData,hex) {
        let m=new maplibregl.Marker({color: hex})
            .setLngLat([pointData.longitude,pointData.latitude])
            .setPopup(new maplibregl.Popup().setHTML('<div class="pointName">'+pointData.name+'</div><div class="pointAddress">'+pointData.address+'</div><div class="pointLatLong">Lat,Long: '+pointData.latitude+', '+pointData.longitude+'</div>'))
            .addTo(map);
        historyData[historyData.findIndex(x=>x.hex===hex)].markers.push(m);
        historyData[historyData.findIndex(x=>x.hex===hex)].data.push(pointData);
    };
    static card(map,pointData,hex,i) {
        let box=E.div(E.get('cards'),'cardItem','');
        E.div(box,'cardName cardText','').innerHTML=pointData.name;
        E.div(box,'cardAddress cardText','').innerHTML=pointData.address;
        if(pointData.url) {
            let url=E.div(E.a(box,'','',pointData.url,'_blank'),'cardIcon','');
            let parseUrl=new URL(pointData.url);
            url.innerHTML='<i class="fa-light fa-link"></i> '+parseUrl.host;
        }
        //
        box.style.borderLeft='10px solid '+hex;
        box.onclick=()=>{
            map.setZoom(14);
            map.panTo([pointData.longitude,pointData.latitude]);
        };
        setTimeout(()=>{
            box.style.opacity='1';
        },600+(i*90));
    };
    static history(map,prompt,hex) {
        let tr=E.tableR(E.get('historyTable'));
        let dot=E.div(E.tableC(tr,'10%'),'historyItemDot','');
        dot.innerHTML='<i class="fa-solid fa-location-dot"></i>';
        dot.style.color=hex;
        dot.onclick=()=>{
            map.panTo(historyData[historyData.findIndex(x=>x.hex===hex)].markers[0].getLngLat());
            E.get('cards').innerHTML='';
            historyData[historyData.findIndex(x=>x.hex===hex)].data.forEach((dataPoint,i)=>{
                MapInterface.card(map,dataPoint,hex,i);
            });
        };
        let text=E.div(E.tableC(tr,'80%'),'historyItemText','');
        text.innerHTML=T.s(prompt,15);
        text.title=prompt;
        text.onclick=()=>{
            map.panTo(historyData[historyData.findIndex(x=>x.hex===hex)].markers[0].getLngLat());
            E.get('cards').innerHTML='';
            historyData[historyData.findIndex(x=>x.hex===hex)].data.forEach((dataPoint,i)=>{
                MapInterface.card(map,dataPoint,hex,i);
            });
        };
        let rm=E.div(E.tableC(tr,'10%'),'historyItemRm','');
        rm.innerHTML='<i class="fa-solid fa-xmark"></i>';
        rm.onclick=(e)=>{
            I.confirmFloater(e,(c)=>{
                if(c) {
                    E.get('historyTable').deleteRow(tr.rowIndex);
                    for(let i=0;i<historyData[historyData.findIndex(x=>x.hex===hex)].markers.length;i++) {
                        historyData[historyData.findIndex(x=>x.hex===hex)].markers[i].remove();
                    }
                    historyData.splice(historyData.findIndex(x=>x.hex===hex),1);
                }
            });
        };
    };
}

class DiscoverInterface extends I {
    static map() {
        I.menu();
        
        // map
        let mapBox=E.div(body,'','mapBox');
        //
        
        //
        let discoverBox=E.div(body,'','discoverBox');
        let optBox=E.div(discoverBox,'','discoverOptBox');
        let resultsBox=E.div(discoverBox,'','discoverResultsBox');
        let optBox2=E.div(optBox,'','discoverOptButtonBox');
        let model=E.div(optBox2,'promptOptions','model');
        model.innerHTML='<span class="promptOptIcon"><i class="fa-solid fa-brain-circuit"></i></span> <span class="promptOptText">'+selectedModel.text+'</span>';
        model.title='Select model.';
        model.onclick=()=>{
            if(modelOptions.findIndex(x=>x.value===selectedModel.value)<modelOptions.length-1) selectedModel=modelOptions[modelOptions.findIndex(x=>x.value===selectedModel.value)+1];
            else selectedModel=modelOptions[0];
            model.innerHTML='<span class="promptOptIcon"><i class="fa-solid fa-brain-circuit"></i></span> <span class="promptOptText">'+selectedModel.text+'</span>';
        };
        let cursor=E.div(optBox2,'promptOptions','model');
        cursor.innerHTML='<span class="promptOptIcon"><i class="fa-solid fa-arrow-pointer"></i></span> <span class="promptOptText">Cursor Enabled</span>';
        cursor.title='Toggle cursor.';
        cursor.onclick=()=>{
            switch(cursorEnabled) {
                case true:
                    cursorEnabled=false;
                    cursor.innerHTML='<span class="promptOptIcon"><i class="fa-solid fa-arrow-pointer"></i></span> <span class="promptOptText">Cursor Disabled</span>';
                    break;
                case false:
                    cursorEnabled=true;
                    cursor.innerHTML='<span class="promptOptIcon"><i class="fa-solid fa-arrow-pointer"></i></span> <span class="promptOptText">Cursor Enabled</span>';
                    break;
            }
        };

        // history
        let history=E.div(body,'','history');
        E.div(history,'','historyTitle').innerHTML='History';
        E.table(history,'','historyTable','center','90%');

        map=new maplibregl.Map({
            container:'mapBox',
            //style:styleData.mapStyle,
            style:'http://localhost:3939/godview_light.json',
            center:[-73.9856,40.7128],
            zoom:10
        });

        map.on('style.load',()=>{
            map.on('click',(e)=>{
                if(cursorEnabled) {
                    let coordinates=e.lngLat;
                    lat=parseFloat(e.lngLat.wrap().lat).toFixed(4);
                    long=parseFloat(e.lngLat.wrap().lng).toFixed(4);
                    let popup=new maplibregl.Popup()
                        .setLngLat(coordinates)
                        .setHTML('<div class="discoverButtonInfo">Coordinates:<br/>['+lat+', '+long+']</div><button class="discoverButton" onclick="DiscoverInterface.prompt();"><i class="fa-solid fa-comment"></i> Disover Location</button>')
                        .addTo(map);
                    popups.push(popup);
                }
            });
        });

    };
    static prompt() {
        popups.forEach((p)=>{
            p.remove();
        });
        let load=E.img(E.get('discoverResultsBox'),'','discoverLoad',rootURL+'/loading2.gif');
        A.r('POST','/discover',{latitude:lat,longitude:long,model:selectedModel.value},(error,data)=>{
            if(!error) {
                if(data) {
                    E.get('discoverResultsBox').removeChild(load);
                    let hex='#'+(Math.random() * 0xFFFFFF << 0).toString(16).padStart(6, '0');
                    DiscoverInterface.point(lat,long,hex);
                    let item=E.div(E.get('discoverResultsBox'),'discoverItem','');
                    E.div(item,'discoverItemTitle','').innerHTML='<i class="fa-solid fa-location-dot" style="color:'+hex+'"></i> ['+lat+', '+long+']';
                    E.div(item,'discoverItemText','').innerHTML='<pre>'+data+'</pre>';
                    item.scrollIntoView();
                    item.onclick=()=>{
                        map.panTo(discoverHistoryData[discoverHistoryData.findIndex(x=>x.hex===hex)].marker.getLngLat());
                    };
                }
            }
            else I.error(error);
        });
    };
    
    static point(lat,long,hex) {
        let m=new maplibregl.Marker({color: hex})
            .setLngLat([long,lat])
            .setPopup(new maplibregl.Popup().setHTML('<div class="pointLatLong">Lat,Long: '+lat+', '+long+'</div>'))
            .addTo(map);
        discoverHistoryData.push({hex:hex,marker:m});
    }
}