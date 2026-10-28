
#ifndef PLANT_SUITABILITY_V3_MODEL_H
#define PLANT_SUITABILITY_V3_MODEL_H

/* Input features:
   features[0] = Plant type (0 = Aloe Vera, 1 = Pothos)
   features[1] = Soil moisture percentage
   features[2] = Temperature in Celsius
   features[3] = Air humidity percentage
   features[4] = Is daytime (0 = No, 1 = Yes)
   features[5] = Low-light duration in minutes
   features[6] = Excessive-light duration in minutes
*/

/* Output classes:
   0 = High stress
   1 = Moderate stress
   2 = Suitable
*/

int predict_plant_suitability_v3(const float features[7]);

#endif
