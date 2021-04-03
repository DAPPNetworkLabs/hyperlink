<template>
  <div class="content">
    <div class="container-fluid">
      <div class="row">

        <div class="col-12">
          <card class="strpied-tabled-with-hover"
                body-classes="table-full-width table-responsive"
          >
            <template slot="header">
              <h4 class="card-title">DSP Log</h4>
               <button v-on:click="onClear" type="button" class="btn-simple btn btn-xs btn-info" v-tooltip.top-center="editTooltip">
                <i class="fa fa-edit"></i>
              </button>
            </template>
            <l-table class="table-hover table-striped table-sm"
                     :columns="table1.columns"
                     :data="table1.data">
            </l-table>
          </card>

        </div>

      </div>
    </div>
  </div>
</template>
<script>
  import LTable from 'src/components/Table.vue'
  import Card from 'src/components/Cards/Card.vue'
  const tableColumns = ['ts', 'message', 'jsonobject','level']
  
  const d = {table1:{
    data:[],
    columns: tableColumns
  }};
  dsp.backend.onLog.subscribe((sender,{ts,level,data}) => {
      const data2 = JSON.parse(JSON.stringify(data));
      const message = data.message;
        delete data2['message'];
        if(data2.config && data2.config.meta)
          delete data2.config.meta['uiParts'];
        
        d.table1.data.push({
          ts:ts.toISOString(),
          message,
          jsonobject:JSON.stringify(data2, null, 2),
          level
        });              
    } );
  export default {
    components: {
      LTable,
      Card
    },
    methods:{
      onClear(){
        d.table1.data = [];
      }
    },
    data () {      
      return d;
    }
  }
</script>
<style>
</style>
