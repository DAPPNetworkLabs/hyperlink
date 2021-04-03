<template>
  <div class="content">
    <div class="container-fluid">
      <div class="row">

        <div class="col-12">
          <card class="strpied-tabled-with-hover"
                body-classes="table-full-width table-responsive"
          >
            <template slot="header">
              <h4 class="card-title">Running DSP Processes</h4>
            </template>
            <process-table class="table-hover table-striped table-sm"
                     :columns="data.columns"
                     :data="data.table1.processes">
            </process-table>
          </card>

        </div>

      </div>
    </div>
  </div>
</template>
<script>
  import ProcessTable from 'src/components/ProcessTable.vue'
  import Card from 'src/components/Cards/Card.vue'
  const tableColumns = ['id', 'config','state','subscriber','owner']
  const tableData = []
  const localData = {data:{table1:{processes:[]},columns:tableColumns}};

  export default {
    components: {
      ProcessTable,
      Card
    },
    data () {
      Promise.all(Object.keys(dsp.backend.channels).map(async k=>{
            return { ...dsp.backend.channels[k], state:await dsp.backend.getChannelState(k) }
          })).then(processes=>{
              localData.data.table1.processes = processes;
          });      
        return localData;
      } 
           
  }
</script>
<style>
</style>
