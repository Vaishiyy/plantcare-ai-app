#include <stdio.h>
#include <stdlib.h>
int predict_plant_suitability(const float features[5]);
int main(void){
  srand(12345);
  for(int i=0;i<200000;i++){
    float f[5];
    f[0]=(float)(rand()%2);
    if(i%2){ /* firmware-like integer inputs, temp fixed 25 */
      f[1]=(float)(rand()%101); f[2]=25.0f; f[3]=(float)(20+rand()%76); f[4]=(float)(rand()%4096);
    } else { /* general float inputs across dataset ranges */
      f[1]=(float)rand()/RAND_MAX*100.0f; f[2]=10.0f+(float)rand()/RAND_MAX*30.0f;
      f[3]=20.0f+(float)rand()/RAND_MAX*70.0f; f[4]=(float)(rand()%4096);
    }
    printf("%.9g %.9g %.9g %.9g %.9g %d\n",f[0],f[1],f[2],f[3],f[4],predict_plant_suitability(f));
  }
}
