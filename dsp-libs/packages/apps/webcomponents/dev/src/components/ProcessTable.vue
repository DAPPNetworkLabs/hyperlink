<template>
  <table class="table">
    <thead>
      <slot name="columns">
        <tr>
          <th>Delete</th>
          <th>Preview</th>
          <th v-for="column in columns" :key="column">{{column}}</th>
        </tr>
      </slot>
    </thead>
    <tbody>
    <tr v-for="(item, index) in data" :key="index">
      <slot :row="item">
        <td>
              <button v-on:click="onDelete(item,data,index)" type="button" class="btn-simple btn btn-xs btn-info" v-tooltip.top-center="editTooltip">
                <i class="fa fa-edit"></i>
              </button>
        </td>
        <td>
        <div v-html="getPreviewForItem(item)"></div>
        </td>
        <td v-for="column in columns" :key="column" v-if="hasValue(item, column)">
        <pre>{{itemValue(item, column)}}</pre></td>
      </slot>
    </tr>
    </tbody>
  </table>
</template>
<script>
  // add: extract canvas and render as inline base64 images
  function getPreviewFromState(state){
        // no image
        // return <img src=''></img>
        if(!state)
          return '';
        const itemPreview = state.preview;
        if(!itemPreview){
          const placeHolder = `<div class="previewPlaceholder"></div>`;
          if(state.processors){
            let children = [];
            if(Array.isArray(state.processors)){
              children = state.processors;
            }
            else{
              // object
              children = Object.keys(state.processors).map(key=>state.processors[key]);
            }
            return  (`<div class="previewsContainer">
            ${children.map(processorState=>
                getPreviewFromState(processorState)
              ).join('')}</div>`)
          }
          return placeHolder;
        }        
        return (`<div class="previewContainer"><img style="max-width: 100px; max-height: 100px;" src="${itemPreview.src}"/></div>`)
  }

  export default {
    name: 'process-table',
    props: {
      columns: Array,
      data: Array
    },
    methods: {
      getPreviewForItem(item){
        // extract from fs if needed        
        return getPreviewFromState(item.state);
      },
      onDelete (item, data,index){
        dsp.backend.removeChannel(item.id);
        data.splice(index,1);
      },
      hasValue (item, column) {
        return item[column.toLowerCase()] !== 'undefined'
      },
      itemValue (item, column) {
        return item[column.toLowerCase()]
      }
    }
  }
</script>
<style>
</style>
