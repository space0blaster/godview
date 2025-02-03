const body=document.getElementsByTagName('body')[0];
const rootURL=window.location.protocol+'//'+window.location.host;
const assetsURL='';
const iconURL='';
let a=rootURL+'/api';
const c="";
//
let name=' - Godview';

let menuCollapse=false;
let styleData={
    rowAlternateBackgroundColor:'#FAFAFA',
    rowFocusedCellWidth:'2px',
    mapStyleOSM:rootURL+"/godview_light.json",
};
if(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    //
    styleData.rowAlternateBackgroundColor='#26354A';
    styleData.mapStyleOSM=rootURL+"/godview_dark.json";
}