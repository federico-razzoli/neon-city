/* SPDX-License-Identifier: AGPL-3.0-only */
#include "geometry.h"
double geometry_output[4*8*4*5];
__attribute__((export_name("output")))
double *output_buffer(void){return geometry_output;}
