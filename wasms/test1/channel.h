#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <unistd.h>
#include <fcntl.h>
#include <errno.h>
#include <math.h>
#include <sys/types.h>
#include <sys/stat.h>
// #define WASM_EXPORT __attribute__((visibility("default")))

// extern void pushEvent(char* eventIdPtr,unsigned long eventIdLen, char* eventDataPtr,unsigned long eventDataLen);
// extern void clear();
// extern char* getChannelConfig(char * keyPtr, unsigned long keyLen);

// char newStr[1024];
// WASM_EXPORT
// long allocateString (unsigned long length) {  
//   return &newStr[0];
// }
int writeFile(char * path, char * eventData){
    ssize_t n, m;
    
    int out = open(path, O_TRUNC | O_WRONLY | O_CREAT, 0660);
    if(out < 0){
        fprintf(stderr, "open error: %s\n", strerror(errno));
        return -2;
    }
    n = strlen(eventData);
    char *ptr = eventData;
    while (n > 0) {
        m = write(out, ptr, (size_t)n);
        if (m < 0) {
            fprintf(stderr, "write error: %s\n", strerror(errno));
            return -3;
            // exit(1);
        }
        n -= m;
        ptr += m;
    }
    close(out);
    return 0;
}
#define MAXBUFLEN 10000

int readFile(char * path, char * fileData){
  int fd = open(path, O_RDONLY | O_EXCL);
  if (fd < 0)
    return -1;
  size_t newLen = read(fd, fileData, MAXBUFLEN);  
  fileData[++newLen] = '\0'; /* Just to be safe. */

  close(fd);

  return 0;
}
int readEvent(char * eventId, char * outEventData){
    char res[50] = "";    
    strcat(res, "/s/events.in/");
    strcat(res, eventId);
    return readFile(res, outEventData);    
}
int _pushEvent(char * eventId, char * eventData){
    char res[50] = "";    
    strcat(res, "/s/events.out/");     
    strcat(res, eventId);
    return writeFile(res,eventData);    
}
// char* _getChannelConfig(char * keyPtr){
//   getChannelConfig(keyPtr, strlen(keyPtr));
//   return newStr;
// }
int inited = 0;
int init(void);
int process(void);
int main(void) {
  if(!inited){
    inited = 1;
    return init();
  }
  else{
    return process();
  }

}
