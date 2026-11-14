/* SPDX-License-Identifier: AGPL-3.0-only */
#include "geometry.h"
double geometry_output[56*29];
__attribute__((export_name("output")))
double *output_buffer(void){return geometry_output;}
