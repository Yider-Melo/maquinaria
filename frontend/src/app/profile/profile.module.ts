import { NgModule } from '@angular/core';
import { SharedModule } from '../shared/shared.module';
import { Profile } from './profile.component';
import { ProfileRoutingModule } from './profile-routing.module';

@NgModule({ imports: [SharedModule, Profile, ProfileRoutingModule] })
export class ProfileModule {}
