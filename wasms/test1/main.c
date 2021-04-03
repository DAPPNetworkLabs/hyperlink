#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <unistd.h>
#include <fcntl.h>
#include <errno.h>
#include <math.h>
#include <sys/types.h>
#include <sys/stat.h>
#include "channel.h"
#include "preview.h"

int process(void) {  
  int counter = 0;
  
  // readOldId
  int fd = open("/s/counter", O_RDONLY);
  char oldId[20] = "";
  if(fd > 0){
      readFile("/s/counter", oldId);
      counter = atoi(oldId);
  }  

  close(fd);

  char configPath[50] = "";
  strcat(configPath, "/s/config/eventValues");
  char prefix[1000] = "";
  readFile(configPath, prefix);

  // newId
  char newId[20] = "";  
  sprintf(newId,"%d",++counter);
  writeFile("/s/counter",newId);  

  char * svg = malloc(250);
  sprintf(svg,"<svg width=\"%d\" height=\"50\" xmlns=\"http://www.w3.org/2000/svg\">" 
        "<rect width='100%%' height='100%%' fill=\"green\"/>"
      "</svg>",counter);
  writePreviewSVG(svg);
  // data:
  char res[50] = "";
  strcat(res, prefix);             // prefix
  strcat(res, newId);              // + id  
  return _pushEvent(newId, res);  
}


int init(void){
    char * rawImageData = generateTestImage(100,100);
    writePreviewBitmap(rawImageData, 100, 100);
    
    return 0;
}

