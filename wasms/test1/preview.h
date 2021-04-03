#include <stdio.h>
#include "base64.h"

const int BYTES_PER_PIXEL = 3; /// red, green, & blue
const int FILE_HEADER_SIZE = 14;
const int INFO_HEADER_SIZE = 40;

int generateBitmapImage ( char* image, int height, int width,  char* buffer);
 char* createBitmapFileHeader(int height, int stride);
 char* createBitmapInfoHeader(int height, int width);

char* generateTestImage(size_t height,size_t width){
     char * image = malloc(height*width*BYTES_PER_PIXEL);    
    int i, j;
    int offset = 0;
    for (i = 0; i < height; i++) {
        for (j = 0; j < width; j++) {
            image[offset++] = ( char) ( i * 255 / height );             ///red
            image[offset++] = ( char) ( j * 255 / width );              ///green
            image[offset++] = ( char) ( (i+j) * 255 / (height+width) ); ///blue
        }
    }

    return image;
}
int writePreview(char * data){
  return writeFile("/s/preview.src", data);
}
int generateBitmapImage ( char* image, int height, int width,  char* buffer)
{
    int widthInBytes = width * BYTES_PER_PIXEL;

     char padding[3] = {0, 0, 0};
    int paddingSize = (4 - (widthInBytes) % 4) % 4;

    int stride = (widthInBytes) + paddingSize;

    // FILE* imageFile = fopen(imageFileName, "wb");
    int offset =0;
     char* fileHeader = createBitmapFileHeader(height, stride);
    memcpy(buffer + offset, fileHeader, FILE_HEADER_SIZE);
    offset += FILE_HEADER_SIZE;
     char* infoHeader = createBitmapInfoHeader(height, width);
    memcpy(buffer + offset, infoHeader, INFO_HEADER_SIZE);
    offset += INFO_HEADER_SIZE;
    int i;
    for (i = 0; i < height; i++) {
        memcpy(buffer + offset, image + (i*widthInBytes), widthInBytes);
        offset += widthInBytes;        
        memcpy(buffer + offset, padding, paddingSize);
        offset += paddingSize;
    }
    return offset;
}
void writePreviewBitmap( char * rawImageData, int height, int width){
    char *bitmap = malloc(height*width*4 + 54);
    int imgSize = generateBitmapImage(rawImageData, height, width, bitmap);
    char * bitmapBase64 = malloc(Base64encode_len(imgSize));
    int output_length = Base64encode(bitmapBase64, bitmap,
                    imgSize);
    char * imageData = malloc(output_length+ 100);
    imageData[0] = 0;
    strcat(imageData, "data:image/bmp;base64,");
    strcat(imageData, bitmapBase64);    
    writePreview(imageData);

}
void writePreviewSVG( char * svg){
    int imgSize = strlen(svg);
    char * svgBase64 = malloc(Base64encode_len(imgSize));
    int output_length = Base64encode(svgBase64, svg,
                    imgSize);
    char * imageData = malloc(output_length+ 100);
    sprintf(imageData,"data:image/svg+xml;base64,%s", svgBase64);
    writePreview(imageData);

}
char* createBitmapFileHeader (int height, int stride)
{
    int fileSize = FILE_HEADER_SIZE + INFO_HEADER_SIZE + (stride * height);

    static  char fileHeader[] = {
        0,0,     /// signature
        0,0,0,0, /// image file size in bytes
        0,0,0,0, /// reserved
        0,0,0,0, /// start of pixel array
    };

    fileHeader[ 0] = (char)('B');
    fileHeader[ 1] = (char)('M');
    fileHeader[ 2] = (char)(fileSize      );
    fileHeader[ 3] = (char)(fileSize >>  8);
    fileHeader[ 4] = (char)(fileSize >> 16);
    fileHeader[ 5] = (char)(fileSize >> 24);
    fileHeader[10] = (char)(FILE_HEADER_SIZE + INFO_HEADER_SIZE);

    return fileHeader;
}

 char* createBitmapInfoHeader (int height, int width)
{
    static  char infoHeader[] = {
        0,0,0,0, /// header size
        0,0,0,0, /// image width
        0,0,0,0, /// image height
        0,0,     /// number of color planes
        0,0,     /// bits per pixel
        0,0,0,0, /// compression
        0,0,0,0, /// image size
        0,0,0,0, /// horizontal resolution
        0,0,0,0, /// vertical resolution
        0,0,0,0, /// colors in color table
        0,0,0,0, /// important color count
    };

    infoHeader[ 0] = ( char)(INFO_HEADER_SIZE);
    infoHeader[ 4] = ( char)(width      );
    infoHeader[ 5] = ( char)(width >>  8);
    infoHeader[ 6] = ( char)(width >> 16);
    infoHeader[ 7] = ( char)(width >> 24);
    infoHeader[ 8] = ( char)(height      );
    infoHeader[ 9] = ( char)(height >>  8);
    infoHeader[10] = ( char)(height >> 16);
    infoHeader[11] = ( char)(height >> 24);
    infoHeader[12] = ( char)(1);
    infoHeader[14] = ( char)(BYTES_PER_PIXEL*8);

    return infoHeader;
}
